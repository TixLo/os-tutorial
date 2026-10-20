import { EventEmitter } from '../core/EventEmitter.js';

// The machine's front panel: buttons, indicator LEDs, and the time-since-power clock.
// Events: 'power' (button pressed)
export class FrontPanelView extends EventEmitter {
  #root;
  #powerButton;
  #clock;

  constructor(root = document.getElementById('front-panel')) {
    super();
    this.#root = root;
    this.#powerButton = root.querySelector('[data-action="power"]');
    this.#clock = root.querySelector('.fp-clock-value');
    this.#powerButton.addEventListener('click', () => this.emit('power'));
  }

  render({ powered, led, time }) {
    this.#clock.textContent = time;
    this.#clock.parentElement.dataset.running = String(powered);
    this.#root.dataset.power = led ? 'on' : 'off';
    this.#powerButton.setAttribute('aria-pressed', String(powered));
  }
}
