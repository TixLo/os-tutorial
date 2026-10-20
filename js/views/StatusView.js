const CPU_LABELS = Object.freeze({
  off: 'Off',
  reset: 'Held in reset',
  starting: 'Leaving reset',
  running: 'Real mode',
});

// Status bar along the bottom of the page.
export class StatusView {
  #time;
  #cpu;
  #csip;

  constructor(root = document.getElementById('statusbar')) {
    this.#time = root.querySelector('[data-status="time"]');
    this.#cpu = root.querySelector('[data-status="cpu"]');
    this.#csip = root.querySelector('[data-status="csip"]');
  }

  render({ time, cpu, csip }) {
    this.#time.textContent = time;
    this.#cpu.textContent = CPU_LABELS[cpu];
    this.#csip.textContent = csip;
  }
}
