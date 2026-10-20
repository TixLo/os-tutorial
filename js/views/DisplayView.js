// The monitor. Before the BIOS sets up the video card there is nothing to show,
// so it displays the monitor's own "no signal" message.
export class DisplayView {
  #root;

  constructor(root = document.getElementById('monitor')) {
    this.#root = root;
  }

  // monitor: 'off' | 'nosignal'
  render(monitor) {
    this.#root.dataset.monitor = monitor;
  }
}
