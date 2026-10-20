import { EventEmitter } from '../core/EventEmitter.js';

const PRESS_MS = 700;

// The machine's front panel: buttons and indicator LEDs.
// Events: 'power' (button pressed)
export class FrontPanelView extends EventEmitter {
  #root;
  #powerButton;
  #pressTimer = null;

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

  // Show the power button being pressed when playback presses it automatically
  press() {
    clearTimeout(this.#pressTimer);
    this.#powerButton.classList.remove('pressed');
    void this.#powerButton.offsetWidth;  // restart the animation
    this.#powerButton.classList.add('pressed');
    this.#pressTimer = setTimeout(() => this.#powerButton.classList.remove('pressed'), PRESS_MS);
  }
}
