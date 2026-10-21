import { EventEmitter } from '../core/EventEmitter.js';

// Tabs for the panel under memory: CODE and TERMINAL. Steps can pick a tab, and the
// reader can switch by hand. Events: 'select' (tab name) when a tab is clicked.
export class DockView extends EventEmitter {
  #tabs = new Map();    // name -> { button, body }

  constructor(root = document.getElementById('dock')) {
    super();
    for (const button of root.querySelectorAll('[role="tab"]')) {
      const body = document.getElementById(button.getAttribute('aria-controls'));
      this.#tabs.set(button.dataset.tab, { button, body });
      button.addEventListener('click', () => {
        this.select(button.dataset.tab);
        this.emit('select', button.dataset.tab);
      });
    }
  }

  select(name) {
    for (const [tab, { button, body }] of this.#tabs) {
      const active = tab === name;
      button.setAttribute('aria-selected', String(active));
      body.hidden = !active;
    }
  }
}
