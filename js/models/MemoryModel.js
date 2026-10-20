import { EventEmitter } from '../core/EventEmitter.js';
import { MEMORY_MAP, ROM_BYTES } from '../data/memoryMap.js';

// Region states:
//   off        no power
//   undefined  RAM is powered but holds random contents
//   tested     RAM that POST has checked (it still holds leftover test patterns)
//   written    RAM the BIOS has filled with real data
//   rom        firmware is present and readable
//   unmapped   nothing answers at these addresses
const POWERED_STATE = Object.freeze({
  ram: 'undefined',
  vram: 'undefined',
  rom: 'rom',
  reserved: 'unmapped',
});

// RAM states laid over regions, lowest priority first
const OVERLAY_STATES = Object.freeze(['tested', 'written']);

// 80 x 25 text mode: each character is 2 bytes (code, then color) starting at 0xB8000
const TEXT_SCREEN = Object.freeze({ start: 0xB8000, columns: 80, rows: 25, color: 0x07 });

// True when the intervals together cover every address of `range`
function covers(intervals, range) {
  let next = range.start;
  for (const { start, end } of [...intervals].sort((a, b) => a.start - b.start)) {
    if (start > next) break;
    next = Math.max(next, end + 1);
    if (next > range.end) return true;
  }
  return false;
}

// Memory regions, their state, the bytes we know, and what the current step points at.
// Emits 'change' (snapshot).
export class MemoryModel extends EventEmitter {
  #regions = MEMORY_MAP.map((region) => ({ ...region, state: 'off', note: null }));
  #romBytes = new Map();  // address -> byte value, present whenever there is power
  #known = new Map();     // ROM bytes plus everything written so far
  #overlays = [];         // { start, end, state }, sorted by OVERLAY_STATES priority
  #powered = false;
  #focus = null;

  constructor() {
    super();
    for (const { address, bytes } of ROM_BYTES) {
      bytes.forEach((value, i) => this.#romBytes.set(address + i, value));
    }
  }

  get regions() {
    return this.#regions.map((region) => ({ ...region }));
  }

  // regions, overlays, focus, and a byte reader. focus: { id, note } plus optionally
  // bytes: [start, end] to zoom in on, or range: [start, end] to outline without zooming
  get snapshot() {
    return {
      regions: this.regions,
      overlays: this.#overlays.map((overlay) => ({ ...overlay })),
      focus: this.#focus,
      readByte: (address) => this.readByte(address),
    };
  }

  // A byte's value when known, null when it is random RAM or not shown,
  // undefined when there is no power
  readByte(address) {
    if (!this.#powered) return undefined;
    return this.#known.has(address) ? this.#known.get(address) : null;
  }

  // memory: { powered, focus }, plus the step's ranges, writes, and screen lines.
  // Everything is rebuilt from the step's state, so stepping backward works too.
  apply({ powered, focus, ranges = {}, writes = {}, screen = [] }) {
    this.#powered = powered;
    this.#focus = focus || null;
    this.#known = new Map(this.#romBytes);
    const overlays = [];

    if (powered) {
      for (const { start, end, state } of Object.values(ranges)) overlays.push({ start, end, state });
      for (const write of Object.values(writes)) {
        this.#write(write);
        overlays.push({ start: write.start, end: write.end, state: 'written' });
      }
      if (screen.length) overlays.push(this.#writeScreen(screen));
    }
    overlays.sort((a, b) => OVERLAY_STATES.indexOf(a.state) - OVERLAY_STATES.indexOf(b.state));
    this.#overlays = overlays;

    for (const region of this.#regions) {
      region.state = powered ? this.#regionState(region) : 'off';
      region.note = focus && focus.id === region.id ? focus.note : null;
    }
    this.emit('change', this.snapshot);
  }

  // A later write replaces whatever an earlier one put in the same range
  #write({ start, end, data }) {
    for (let address = start; address <= end; address++) this.#known.delete(address);
    for (const [address, bytes] of data) {
      bytes.forEach((value, i) => this.#known.set(address + i, value));
    }
  }

  #writeScreen(lines) {
    const { start, columns, rows, color } = TEXT_SCREEN;
    for (let row = 0; row < rows; row++) {
      const line = lines[row] || '';
      for (let col = 0; col < columns; col++) {
        const address = start + (row * columns + col) * 2;
        this.#known.set(address, (line[col] || ' ').charCodeAt(0));
        this.#known.set(address + 1, color);
      }
    }
    return { start, end: start + columns * rows * 2 - 1, state: 'written' };
  }

  // The strongest RAM state whose overlays cover the whole region, else its base state
  #regionState(region) {
    const base = POWERED_STATE[region.kind];
    if (base !== 'undefined') return base;
    for (let i = OVERLAY_STATES.length - 1; i >= 0; i--) {
      const strongEnough = this.#overlays.filter(
        (overlay) => OVERLAY_STATES.indexOf(overlay.state) >= i);
      if (covers(strongEnough, region)) return OVERLAY_STATES[i];
    }
    return base;
  }
}
