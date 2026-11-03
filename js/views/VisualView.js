import { TableDiagramView } from './TableDiagramView.js';
import { PicView } from './PicView.js';
import { FifoView } from './FifoView.js';
import { TimelineView } from './TimelineView.js';

// Diagrams added after day 3, besides 'board', 'disk', 'gdt', and 'none'
export const VISUALS = Object.freeze(['table', 'pic', 'fifo', 'timeline']);

// The diagram slot in the explanation panel. Each chapter shows the diagram that matters
// to it: the motherboard on day 0, the floppy disk on days 1 and 3, the GDT on day 3, and
// from day 4 tables drawn from the step's data.
export class VisualView {
  #root;
  #disk;
  #diskStatus;
  #gdt;
  #table = new TableDiagramView();
  #pic = new PicView();
  #fifo = new FifoView();
  #timeline = new TimelineView();

  constructor(root = document.getElementById('lesson-visual')) {
    this.#root = root;
    this.#disk = root.querySelector('#disk');
    this.#diskStatus = [...this.#disk.querySelectorAll('.dk-status')];
    this.#gdt = root.querySelector('#gdt');
  }

  // visual: 'board' | 'disk' | 'gdt' | 'table' | 'pic' | 'fifo' | 'timeline' | 'none'
  // disk: { focus: 'boot' | 'read' | 'kernel' | null, note: [line, line] | null }
  // gdt: { focus: 'all' | 'code' | 'data' | null }
  // table, pic, fifo, timeline: see TableDiagramView, PicView, FifoView, TimelineView
  render({ visual, disk, gdt, table, pic, fifo, timeline }) {
    this.#root.dataset.visual = visual;
    this.#disk.dataset.focus = (disk && disk.focus) || '';
    const note = disk && disk.note;
    this.#disk.dataset.note = String(Boolean(note));
    this.#diskStatus.forEach((text, i) => { text.textContent = note ? note[i] || '' : ''; });
    this.#gdt.dataset.focus = (gdt && gdt.focus) || '';
    this.#table.render(visual === 'table' ? table : null);
    this.#pic.render(visual === 'pic' ? pic : null);
    this.#fifo.render(visual === 'fifo' ? fifo : null);
    this.#timeline.render(visual === 'timeline' ? timeline : null);
  }
}
