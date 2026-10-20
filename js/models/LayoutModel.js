import { EventEmitter } from '../core/EventEmitter.js';

const STORAGE_KEY = 'os-tutorial.layout.v1';

// Panel sizes in percent. Emits 'change' (name, percent) whenever a size changes.
export class LayoutModel extends EventEmitter {
  static DEFAULTS = Object.freeze({
    consoleWidth: 60,
    memoryHeight: 50,
  });
  static MIN = 15;  // each panel keeps at least 15%
  static MAX = 85;

  #sizes = { ...LayoutModel.DEFAULTS };

  get names() {
    return Object.keys(this.#sizes);
  }

  get(name) {
    return this.#sizes[name];
  }

  set(name, percent) {
    if (!(name in this.#sizes)) return;
    const value = Math.min(LayoutModel.MAX, Math.max(LayoutModel.MIN, percent));
    const rounded = Math.round(value * 10) / 10;
    if (rounded === this.#sizes[name]) return;
    this.#sizes[name] = rounded;
    this.emit('change', name, rounded);
  }

  nudge(name, delta) {
    this.set(name, this.get(name) + delta);
  }

  reset(name) {
    this.set(name, LayoutModel.DEFAULTS[name]);
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      for (const name of this.names) {
        if (typeof data[name] === 'number') this.set(name, data[name]);
      }
    } catch (e) {}
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#sizes));
    } catch (e) {}
  }
}
