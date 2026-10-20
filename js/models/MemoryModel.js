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

// Memory regions and their state. Emits 'change' (regions).
export class MemoryModel extends EventEmitter {
  #regions = MEMORY_MAP.map((region) => ({ ...region, state: 'off' }));

  get regions() {
    return this.#regions.map((region) => ({ ...region }));
  }

  setPowered(on) {
    for (const region of this.#regions) {
      region.state = on ? POWERED_STATE[region.kind] : 'off';
    }
    this.emit('change', this.regions);
  }
}
