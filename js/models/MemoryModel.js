import { EventEmitter } from '../core/EventEmitter.js';
import { MEMORY_MAP } from '../data/memoryMap.js';

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

// Memory regions, their state, and an optional note pointing out what the CPU is doing there.
// Emits 'change' (regions).
export class MemoryModel extends EventEmitter {
  #regions = MEMORY_MAP.map((region) => ({ ...region, state: 'off', note: null }));

  get regions() {
    return this.#regions.map((region) => ({ ...region }));
  }

  // memory: { powered, focus: { id, note } | null }
  apply({ powered, focus }) {
    for (const region of this.#regions) {
      region.state = powered ? POWERED_STATE[region.kind] : 'off';
      region.note = focus && focus.id === region.id ? focus.note : null;
    }
    this.emit('change', this.regions);
  }
}
