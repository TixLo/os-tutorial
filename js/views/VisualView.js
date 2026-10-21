// The diagram slot in the explanation panel. Each chapter shows the diagram that matters
// to it: the motherboard on day 0, the floppy disk on days 1 and 3, the GDT on day 3.
export class VisualView {
  #root;
  #disk;
  #diskStatus;
  #gdt;

  constructor(root = document.getElementById('lesson-visual')) {
    this.#root = root;
    this.#disk = root.querySelector('#disk');
    this.#diskStatus = [...this.#disk.querySelectorAll('.dk-status')];
    this.#gdt = root.querySelector('#gdt');
  }

  // visual: 'board' | 'disk' | 'gdt' | 'none'
  // disk: { focus: 'boot' | 'read' | 'kernel' | null, note: [line, line] | null }
  // gdt: { focus: 'all' | 'code' | 'data' | null }
  render({ visual, disk, gdt }) {
    this.#root.dataset.visual = visual;
    this.#disk.dataset.focus = (disk && disk.focus) || '';
    const note = disk && disk.note;
    this.#disk.dataset.note = String(Boolean(note));
    this.#diskStatus.forEach((text, i) => { text.textContent = note ? note[i] || '' : ''; });
    this.#gdt.dataset.focus = (gdt && gdt.focus) || '';
  }
}
