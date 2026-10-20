const CPU_LABELS = Object.freeze({
  off: 'no power',
  reset: 'frozen',
  starting: 'waking up',
  running: 'running',
});

const RESET_LABELS = Object.freeze({
  idle: '',
  held: 'held low',
  released: 'released',
});

// Motherboard diagram: components and the signal wires between them.
// All styling is driven by data attributes on the <svg> root (see css/board.css).
export class BoardView {
  #root;
  #cpuState;
  #resetState;

  constructor(root = document.getElementById('board')) {
    this.#root = root;
    this.#cpuState = root.querySelector('.bd-cpu-state');
    this.#resetState = root.querySelector('.bd-reset-state');
  }

  render({ signals, cpu }) {
    const data = this.#root.dataset;
    data.pwrsw = signals.pwrsw;
    data.pson = signals.pson;
    data.rails = signals.rails;
    data.pwrok = signals.pwrok;
    data.reset = signals.reset;
    data.bus = signals.bus;
    data.cpu = cpu;
    this.#cpuState.textContent = CPU_LABELS[cpu];
    this.#resetState.textContent = RESET_LABELS[signals.reset];
  }
}
