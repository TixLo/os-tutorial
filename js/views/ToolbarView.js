import { EventEmitter } from '../core/EventEmitter.js';

// Playback controls in the top bar.
// Events: 'back', 'next', 'play' (toggle auto play)
export class ToolbarView extends EventEmitter {
  #buttons = {};

  constructor(root = document.getElementById('toolbar')) {
    super();
    for (const action of ['back', 'next', 'play']) {
      const button = root.querySelector(`[data-action="${action}"]`);
      button.addEventListener('click', () => this.emit(action));
      this.#buttons[action] = button;
    }
  }

  render({ canBack, canNext, playing }) {
    const { back, next, play } = this.#buttons;
    back.disabled = !canBack;
    next.disabled = !canNext;
    play.disabled = !canNext && !playing;
    play.textContent = playing ? 'Pause' : 'Auto play';
    play.setAttribute('aria-pressed', String(playing));
  }
}
