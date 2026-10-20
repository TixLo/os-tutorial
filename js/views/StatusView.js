const CPU_LABELS = Object.freeze({
  off: 'Off',
  reset: 'Held in reset',
  starting: 'Leaving reset',
  running: 'Real mode',
});

// Status bar along the bottom of the page.
export class StatusView {
  #cpu;
  #csip;

  constructor(root = document.getElementById('statusbar')) {
    this.#cpu = root.querySelector('[data-status="cpu"]');
    this.#csip = root.querySelector('[data-status="csip"]');
  }

  render({ cpu, csip }) {
    this.#cpu.textContent = CPU_LABELS[cpu];
    this.#csip.textContent = csip;
  }
}
