import { EventEmitter } from '../core/EventEmitter.js';

// Machine-wide state such as power. Emits 'power' (on).
export class MachineModel extends EventEmitter {
  #powered = false;

  get powered() {
    return this.#powered;
  }

  setPower(on) {
    if (on === this.#powered) return;
    this.#powered = on;
    this.emit('power', on);
  }

  togglePower() {
    this.setPower(!this.#powered);
  }
}
