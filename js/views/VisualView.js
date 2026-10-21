// The diagram slot in the explanation panel. Each chapter shows the diagram that matters
// to it: the motherboard on day 0, the floppy disk on day 1, and so on.
export class VisualView {
  #root;
  #disk;

  constructor(root = document.getElementById('lesson-visual')) {
    this.#root = root;
    this.#disk = root.querySelector('#disk');
  }

  // visual: 'board' | 'disk'; disk: { focus: 'boot' | null }
  render({ visual, disk }) {
    this.#root.dataset.visual = visual;
    this.#disk.dataset.focus = (disk && disk.focus) || '';
  }
}
