import { EventEmitter } from '../core/EventEmitter.js';
import { CHAPTERS } from '../data/chapters/index.js';
import { buildStates } from '../core/state.js';

// The current chapter, the position in its steps, and the full hardware state there.
// A chapter that starts switched off (day 0) has standby as step 0; later chapters start
// with the machine already running.
// Emits 'chapter' (chapter) when a chapter loads, and 'step' ({ index, step, state, previous }).
export class MachineModel extends EventEmitter {
  #chapters;
  #chapter;
  #states = [];
  #index = 0;

  constructor(chapters = CHAPTERS) {
    super();
    this.#chapters = chapters;
    this.#chapter = chapters[0];
    this.#states = buildStates(this.#chapter.steps);
  }

  get chapters() { return this.#chapters; }
  get chapter() { return this.#chapter; }
  get steps() { return this.#chapter.steps; }
  get index() { return this.#index; }
  get step() { return this.steps[this.#index]; }
  get state() { return this.#states[this.#index]; }
  get firstStep() { return this.#chapter.startsOff ? 1 : 0; }  // first step after power-on
  get powered() { return !this.#chapter.startsOff || this.#index > 0; }
  get isLast() { return this.#index === this.steps.length - 1; }

  // Open a chapter at a step. Returns false for unknown chapters or ones without steps yet.
  loadChapter(id, index = 0) {
    const chapter = this.#chapters.find((c) => c.id === id);
    if (!chapter || !chapter.steps) return false;
    const previous = this.state;
    this.#chapter = chapter;
    this.#states = buildStates(chapter.steps);
    this.#index = Math.min(chapter.steps.length - 1, Math.max(0, index));
    this.emit('chapter', chapter);
    this.emit('step', { index: this.#index, step: this.step, state: this.state, previous });
    return true;
  }

  goto(index) {
    const target = Math.min(this.steps.length - 1, Math.max(0, index));
    if (target === this.#index) return;
    const previous = this.state;
    this.#index = target;
    this.emit('step', { index: target, step: this.step, state: this.state, previous });
  }

  next() { this.goto(this.#index + 1); }
  back() { this.goto(this.#index - 1); }

  // Pressing power while off starts day 0; pressing it while on switches off, which
  // always means day 0's standby step.
  pressPower() {
    if (!this.powered) {
      this.goto(1);
    } else if (this.#chapter === this.#chapters[0]) {
      this.goto(0);
    } else {
      this.loadChapter(this.#chapters[0].id, 0);
    }
  }
}
