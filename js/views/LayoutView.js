import { EventEmitter } from '../core/EventEmitter.js';

const KEY_STEP = 2;  // percent per arrow-key press

// Owns the splitter DOM. Turns user input into events and renders sizes as CSS variables.
// Events: 'resize' (name, percent), 'resizeEnd' (name), 'nudge' (name, delta), 'reset' (name)
export class LayoutView extends EventEmitter {
  #root = document.documentElement;
  #cssVars = new Map();  // size name -> CSS custom property

  constructor(gutters = document.querySelectorAll('.gutter')) {
    super();
    gutters.forEach((gutter) => this.#bindGutter(gutter));
  }

  render(name, percent) {
    const cssVar = this.#cssVars.get(name);
    if (cssVar) this.#root.style.setProperty(cssVar, percent + '%');
  }

  #bindGutter(gutter) {
    const { size: name, cssVar, axis } = gutter.dataset;
    const container = document.getElementById(gutter.dataset.target);
    this.#cssVars.set(name, cssVar);

    gutter.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      gutter.setPointerCapture(e.pointerId);
      gutter.classList.add('dragging');
      document.body.classList.add('resizing', axis === 'x' ? 'resizing-v' : 'resizing-h');
    });

    gutter.addEventListener('pointermove', (e) => {
      if (!gutter.hasPointerCapture(e.pointerId)) return;
      const rect = container.getBoundingClientRect();
      const percent = axis === 'x'
        ? (e.clientX - rect.left) / rect.width * 100
        : (e.clientY - rect.top) / rect.height * 100;
      this.emit('resize', name, percent);
    });

    const stop = (e) => {
      if (!gutter.hasPointerCapture(e.pointerId)) return;
      gutter.releasePointerCapture(e.pointerId);
      gutter.classList.remove('dragging');
      document.body.classList.remove('resizing', 'resizing-v', 'resizing-h');
      this.emit('resizeEnd', name);
    };
    gutter.addEventListener('pointerup', stop);
    gutter.addEventListener('pointercancel', stop);

    // Double-click resets to the default size
    gutter.addEventListener('dblclick', () => this.emit('reset', name));

    // Keyboard: arrow keys adjust by KEY_STEP per press
    gutter.addEventListener('keydown', (e) => {
      const keys = axis === 'x' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
      const i = keys.indexOf(e.key);
      if (i === -1) return;
      e.preventDefault();
      this.emit('nudge', name, i === 0 ? -KEY_STEP : KEY_STEP);
    });
  }
}
