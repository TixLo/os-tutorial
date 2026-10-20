import { EventEmitter } from '../core/EventEmitter.js';

// The ABOUT button on the front panel and the dialog it opens.
// The dialog closes with its buttons, Escape, or a click on the dimmed backdrop.
// Events: 'open' (button pressed), 'close' (dialog closed)
export class AboutView extends EventEmitter {
  #dialog;

  constructor(
    button = document.querySelector('[data-action="about"]'),
    dialog = document.getElementById('about'),
  ) {
    super();
    this.#dialog = dialog;
    button.addEventListener('click', () => this.emit('open'));
    dialog.addEventListener('close', () => this.emit('close'));
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();  // the backdrop, outside the content
    });
  }

  open() {
    if (!this.#dialog.open) this.#dialog.showModal();
  }
}
