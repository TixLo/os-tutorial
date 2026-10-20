import { EventEmitter } from '../core/EventEmitter.js';
import { BOOT_STEPS } from '../data/bootSteps.js';

// Merge a step's patch onto the previous state. Plain objects merge one level deep.
function mergeState(base, patch) {
  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const isPlainObject = value !== null && typeof value === 'object' && !Array.isArray(value);
    next[key] = isPlainObject ? { ...base[key], ...value } : value;
  }
  return next;
}

// The machine's position in the boot sequence and the full hardware state at that step.
// Step 0 is standby (switched off). Emits 'step' ({ index, step, state, previous }).
export class MachineModel extends EventEmitter {
  #steps;
  #states = [];
  #index = 0;

  constructor(steps = BOOT_STEPS) {
    super();
    this.#steps = steps;
    let state = {};
    for (const step of steps) {
      state = mergeState(state, step.state);
      this.#states.push(state);
    }
  }

  get steps() { return this.#steps; }
  get index() { return this.#index; }
  get step() { return this.#steps[this.#index]; }
  get state() { return this.#states[this.#index]; }
  get powered() { return this.#index > 0; }
  get isLast() { return this.#index === this.#steps.length - 1; }

  goto(index) {
    const target = Math.min(this.#steps.length - 1, Math.max(0, index));
    if (target === this.#index) return;
    const previous = this.state;
    this.#index = target;
    this.emit('step', { index: target, step: this.step, state: this.state, previous });
  }

  next() { this.goto(this.#index + 1); }
  back() { this.goto(this.#index - 1); }

  // Pressing power while off starts the sequence; pressing it while on switches off.
  pressPower() {
    this.goto(this.powered ? 0 : 1);
  }
}
