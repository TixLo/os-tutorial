import { EventEmitter } from '../core/EventEmitter.js';
import { MEMORY_MAP, ROM_BYTES } from '../data/memoryMap.js';

// Region states:
//   off        no power
//   undefined  RAM is powered but holds random contents
//   rom        firmware is present and readable
//   unmapped   nothing answers at these addresses
const POWERED_STATE = Object.freeze({
  ram: 'undefined',
  vram: 'undefined',
  rom: 'rom',
  reserved: 'unmapped',
});

// Memory regions, their state, the bytes we know, and what the current step points at.
// Emits 'change' (snapshot).
export class MemoryModel extends EventEmitter {
  #regions = MEMORY_MAP.map((region) => ({ ...region, state: 'off', note: null }));
  #known = new Map();  // address -> byte value
  #powered = false;
  #focus = null;

  constructor() {
    super();
    for (const { address, bytes } of ROM_BYTES) {
      bytes.forEach((value, i) => this.#known.set(address + i, value));
    }
  }

  get regions() {
    return this.#regions.map((region) => ({ ...region }));
  }

  // regions, focus ({ id, note, bytes?: [start, end] } | null), and a byte reader
  get snapshot() {
    return {
      regions: this.regions,
      focus: this.#focus,
      readByte: (address) => this.readByte(address),
    };
  }

  // A byte's value when known, null when it is random RAM or unmodeled ROM,
  // undefined when there is no power
  readByte(address) {
    if (!this.#powered) return undefined;
    return this.#known.has(address) ? this.#known.get(address) : null;
  }

  // memory: { powered, focus }
  apply({ powered, focus }) {
    this.#powered = powered;
    this.#focus = focus || null;
    for (const region of this.#regions) {
      region.state = powered ? POWERED_STATE[region.kind] : 'off';
      region.note = focus && focus.id === region.id ? focus.note : null;
    }
    this.emit('change', this.snapshot);
  }
}
