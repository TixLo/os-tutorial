import { EventEmitter } from '../core/EventEmitter.js';

// The machine's front panel: buttons and indicator LEDs.
// Events: 'power' (button pressed)
export class FrontPanelView extends EventEmitter {
  #root;
  #powerButton;

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
}
