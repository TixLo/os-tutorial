import { EventEmitter } from '../core/EventEmitter.js';

const FLASH_MS = 1200;

// Tabs under the display: MEMORY, CODE, and TERMINAL. Steps pick a tab, the reader can
// switch by hand, and a tab whose content changed while hidden gets a dot until it is
// opened. Events: 'select' (tab name) when a tab is clicked.
export class DockView extends EventEmitter {
  #tabs = new Map();    // name -> { button, body }
  #selected = null;

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
    this.#selected = name;
    for (const [tab, { button, body }] of this.#tabs) {
      const active = tab === name;
      button.setAttribute('aria-selected', String(active));
      body.hidden = !active;
      if (active) button.classList.remove('updated');
    }
  }

  clearUpdates() {
    for (const { button } of this.#tabs.values()) button.classList.remove('updated');
  }

  // A step changed what a tab shows: flash it if it is open, otherwise mark it with a dot
  notify(name) {
    const tab = this.#tabs.get(name);
    if (!tab) return;
    if (name !== this.#selected) {
      tab.button.classList.add('updated');
      return;
    }
    tab.button.classList.remove('flash');
    void tab.button.offsetWidth;  // restart the animation
    tab.button.classList.add('flash');
    setTimeout(() => tab.button.classList.remove('flash'), FLASH_MS);
  }
}
