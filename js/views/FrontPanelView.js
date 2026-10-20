import { EventEmitter } from '../core/EventEmitter.js';

const HINT_MS = 1600;

// The machine's front panel: buttons and indicator LEDs.
// Events: 'power' (button pressed)
export class FrontPanelView extends EventEmitter {
  #root;
  #powerButton;
  #hintTimer = null;

  constructor(root = document.getElementById('front-panel')) {
    super();
    this.#root = root;
    this.#powerButton = root.querySelector('[data-action="power"]');
    this.#powerButton.addEventListener('click', () => this.emit('power'));
  }

  render({ powered, led }) {
    this.#root.dataset.power = led ? 'on' : 'off';
    this.#powerButton.setAttribute('aria-pressed', String(powered));
  }

  // Draw attention to the power button
  hint() {
    clearTimeout(this.#hintTimer);
    this.#powerButton.classList.remove('hint');
    void this.#powerButton.offsetWidth;  // restart the animation
    this.#powerButton.classList.add('hint');
    this.#powerButton.focus();
    this.#hintTimer = setTimeout(() => this.#powerButton.classList.remove('hint'), HINT_MS);
  }
}
