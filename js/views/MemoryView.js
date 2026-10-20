const STATE_LABELS = Object.freeze({
  off: 'Off',
  undefined: 'Undefined',
  rom: 'ROM',
  unmapped: 'Unmapped',
});

const PAGE = 0x1000;          // one cell = 4 KiB
const ROW = 16 * PAGE;        // one row = 64 KiB, so 16 rows = 1 MiB
const ONE_MIB = 0x100000;

const hex = (value) =>
  '0x' + value.toString(16).toUpperCase().padStart(value < ONE_MIB ? 5 : 8, '0');

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  const kib = bytes / 1024;
  return (Number.isInteger(kib) ? kib : kib.toFixed(1)) + ' KiB';
}

const overlap = (a, b) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start) + 1);

// Draws memory as a grid of 4 KiB pages, true to scale: each row is 64 KiB, so the row
// label is the address's leading digits and the column is the next hex digit.
// Rows outside the first 1 MiB (the reset vector area) appear after a gap.
// Hovering or tapping a cell shows what it holds; otherwise the detail area shows the
// region the current step points at.
export class MemoryView {
  #grid;
  #detail;
  #cells = [];       // { start, end, el }
  #regions = [];
  #hovered = null;
  #selected = null;
  #focusId = null;

  constructor(root = document.getElementById('memory-map')) {
    this.#grid = document.createElement('div');
    this.#grid.className = 'mem-grid';
    this.#detail = document.createElement('div');
    this.#detail.className = 'mem-detail';
    this.#detail.setAttribute('aria-live', 'polite');
    root.append(this.#grid, this.#detail);
    this.#bindPointer();
  }

  render(regions) {
    this.#regions = regions;
    if (this.#cells.length === 0) this.#build(regions);

    // A new step pointing somewhere else takes over the detail area from a tapped cell
    const focusId = regions.find((region) => region.note)?.id ?? null;
    if (focusId !== this.#focusId) this.#selected = null;
    this.#focusId = focusId;

    for (const cell of this.#cells) {
      const inside = this.#regionsIn(cell);
      const main = inside.reduce((best, r) => (overlap(r, cell) > overlap(best, cell) ? r : best), inside[0]);
      cell.el.dataset.state = main ? main.state : 'off';
      cell.el.dataset.mixed = String(inside.length > 1);
      cell.el.dataset.focus = String(inside.some((r) => r.note));
    }
    this.#renderDetail();
  }

  #regionsIn(cell) {
    return this.#regions.filter((region) => overlap(region, cell) > 0);
  }

  #build(regions) {
    const grid = this.#grid;
    grid.appendChild(document.createElement('span'));
    for (let col = 0; col < 16; col++) {
      const head = document.createElement('span');
      head.className = 'mem-col';
      head.textContent = col.toString(16).toUpperCase();
      grid.appendChild(head);
    }

    let previousRow = null;
    this.#rowStarts(regions).forEach((rowStart, rowIndex) => {
      if (previousRow !== null && rowStart !== previousRow + ROW) {
        const gap = document.createElement('span');
        gap.className = 'mem-gap';
        gap.textContent = `⋮  ${hex(previousRow + ROW)}–${hex(rowStart - 1)} not shown  ⋮`;
        grid.appendChild(gap);
      }
      previousRow = rowStart;

      const label = document.createElement('span');
      label.className = 'mem-row';
      label.textContent = hex(rowStart);
      grid.appendChild(label);

      for (let col = 0; col < 16; col++) {
        const start = rowStart + col * PAGE;
        const el = document.createElement('div');
        el.className = 'mem-cell';
        el.style.setProperty('--i', rowIndex);
        el.dataset.index = this.#cells.length;
        grid.appendChild(el);
        this.#cells.push({ start, end: start + PAGE - 1, el });
      }
    });
  }

  // Every 64 KiB row of the first 1 MiB, plus the rows any higher region needs
  #rowStarts(regions) {
    const rows = new Set();
    for (let start = 0; start < ONE_MIB; start += ROW) rows.add(start);
    for (const region of regions) {
      if (region.start < ONE_MIB) continue;
      for (let start = region.start - (region.start % ROW); start <= region.end; start += ROW) {
        rows.add(start);
      }
    }
    return [...rows].sort((a, b) => a - b);
  }

  #bindPointer() {
    const cellAt = (e) => {
      const el = e.target.closest('.mem-cell');
      return el ? this.#cells[Number(el.dataset.index)] : null;
    };
    this.#grid.addEventListener('pointerover', (e) => {
      const cell = cellAt(e);
      if (cell === this.#hovered) return;
      this.#hovered = cell;
      this.#renderDetail();
    });
    this.#grid.addEventListener('pointerleave', () => {
      this.#hovered = null;
      this.#renderDetail();
    });
    this.#grid.addEventListener('click', (e) => {
      const cell = cellAt(e);
      this.#selected = cell === this.#selected ? null : cell;
      this.#renderDetail();
    });
  }

  #renderDetail() {
    for (const cell of this.#cells) {
      cell.el.classList.toggle('selected', cell === this.#selected);
    }

    const detail = this.#detail;
    detail.replaceChildren();
    const cell = this.#hovered || this.#selected;
    const focused = this.#regions.find((region) => region.note);

    if (cell) {
      detail.appendChild(this.#line('mem-detail-title',
        `Page ${hex(cell.start)}–${hex(cell.end)} · 4 KiB`));
      for (const region of this.#regionsIn(cell)) detail.appendChild(this.#regionLine(region));
    } else if (focused) {
      detail.appendChild(this.#line('mem-detail-note', focused.note));
      detail.appendChild(this.#regionLine(focused));
    } else {
      detail.appendChild(this.#line('mem-detail-hint',
        'Each cell is a 4 KiB page. Row = address start, column = next hex digit. ' +
        'Hover or tap a cell to see what it holds.'));
    }
  }

  #regionLine(region) {
    const size = region.end - region.start + 1;
    const line = document.createElement('div');
    line.className = 'mem-detail-region';
    line.dataset.state = region.state;
    for (const [text, className] of [
      [region.name, 'mem-detail-name'],
      [`${hex(region.start)}–${hex(region.end)}`, 'mem-detail-range'],
      [formatSize(size), 'mem-detail-size'],
      [STATE_LABELS[region.state], 'mem-detail-state'],
    ]) {
      line.appendChild(this.#line(className, text));
    }
    return line;
  }

  #line(className, text) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
  }
}
