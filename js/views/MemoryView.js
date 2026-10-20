const STATE_LABELS = Object.freeze({
  off: 'Off',
  undefined: 'Undefined',
  tested: 'Tested',
  written: 'Written',
  rom: 'ROM',
  unmapped: 'Unmapped',
});

const ONE_MIB = 0x100000;

// Every level is a 16 × 16 grid; each zoom makes a cell 1/256 of the level above.
const LEVELS = Object.freeze([
  { cell: 0x1000, row: 0x10000, unit: '4 KiB page' },  // whole map: 16 rows = 1 MiB
  { cell: 0x10,   row: 0x100,   unit: '16 bytes' },    // one 4 KiB page
  { cell: 0x1,    row: 0x10,    unit: 'byte' },        // 256 bytes, one cell per byte
]);
const BYTE_LEVEL = LEVELS.length - 1;

const hex = (value) =>
  '0x' + value.toString(16).toUpperCase().padStart(value < ONE_MIB ? 5 : 8, '0');
const hexByte = (value) => value.toString(16).toUpperCase().padStart(2, '0');
const alignDown = (value, size) => value - (value % size);

function formatSize(bytes) {
  if (bytes === 1) return '1 byte';
  if (bytes < 1024) return bytes + ' bytes';
  const kib = bytes / 1024;
  return (Number.isInteger(kib) ? kib : kib.toFixed(1)) + ' KiB';
}

const overlap = (a, b) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start) + 1);

// Draws memory as a true-scale grid that can zoom in three levels:
// 4 KiB pages over the whole map, 16-byte blocks inside one page, and single bytes
// (a hex dump) inside a 256-byte block. Row labels are addresses and the column is the
// next hex digit, at every level. Tap a cell to zoom in; the trail above zooms back out.
// A step that points at specific bytes zooms there on its own, and locate() jumps to one.
export class MemoryView {
  #trail;
  #grid;
  #detail;
  #cells = [];         // { start, end, el }
  #snapshot = { regions: [], overlays: [], focus: null, readByte: () => undefined };
  #zoom = { level: 0, start: 0 };
  #focusKey;
  #hovered = null;
  #selected = null;

  constructor(root = document.getElementById('memory-map')) {
    this.#trail = document.createElement('nav');
    this.#trail.className = 'mem-trail';
    this.#trail.setAttribute('aria-label', 'Memory zoom level');
    this.#grid = document.createElement('div');
    this.#grid.className = 'mem-grid';
    this.#detail = document.createElement('div');
    this.#detail.className = 'mem-detail';
    this.#detail.setAttribute('aria-live', 'polite');
    root.append(this.#trail, this.#grid, this.#detail);
    this.#bindPointer();
  }

  render(snapshot) {
    this.#snapshot = snapshot;
    const { focus } = snapshot;
    const focusKey = focus ? `${focus.id}:${focus.bytes || ''}:${focus.range || ''}` : '';
    if (focusKey !== this.#focusKey) {
      // A step pointing somewhere new picks the zoom and clears any tapped cell
      this.#focusKey = focusKey;
      this.#selected = null;
      this.#zoomTo(focus && focus.bytes
        ? { level: BYTE_LEVEL, start: alignDown(focus.bytes[0], LEVELS[BYTE_LEVEL].row * 16) }
        : { level: 0, start: 0 });
    } else {
      this.#paint();
    }
  }

  // Zoom to the byte at an address and select it
  locate(address) {
    this.#zoomTo({ level: BYTE_LEVEL, start: alignDown(address, LEVELS[BYTE_LEVEL].row * 16) });
    this.#selected = this.#cells.find((cell) => cell.start === address) || null;
    this.#paint();
    if (this.#selected) this.#selected.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  #zoomTo(zoom) {
    this.#zoom = zoom;
    this.#hovered = null;
    this.#build();
    this.#paint();
  }

  #regionsIn(range) {
    return this.#snapshot.regions.filter((region) => overlap(region, range) > 0);
  }

  #focusRange() {
    const { focus, regions } = this.#snapshot;
    if (!focus) return null;
    const span = focus.bytes || focus.range;
    if (span) return { start: span[0], end: span[1] };
    return regions.find((region) => region.id === focus.id) || null;
  }

  // Row start addresses for the current zoom
  #rowStarts() {
    const { level, start } = this.#zoom;
    const { row } = LEVELS[level];
    const rows = [];
    if (level > 0) {
      for (let i = 0; i < 16; i++) rows.push(start + i * row);
      return rows;
    }
    // Whole map: every row of the first 1 MiB, plus the rows any higher region needs
    const set = new Set();
    for (let addr = 0; addr < ONE_MIB; addr += row) set.add(addr);
    for (const region of this.#snapshot.regions) {
      if (region.start < ONE_MIB) continue;
      for (let addr = alignDown(region.start, row); addr <= region.end; addr += row) set.add(addr);
    }
    return [...set].sort((a, b) => a - b);
  }

  #build() {
    const { level } = this.#zoom;
    const { cell: cellSize, row: rowSize } = LEVELS[level];
    const grid = this.#grid;
    grid.replaceChildren();
    grid.dataset.level = level;
    this.#cells = [];

    grid.appendChild(document.createElement('span'));
    for (let col = 0; col < 16; col++) {
      const head = document.createElement('span');
      head.className = 'mem-col';
      head.textContent = col.toString(16).toUpperCase();
      grid.appendChild(head);
    }

    let previousRow = null;
    this.#rowStarts().forEach((rowStart, rowIndex) => {
      if (previousRow !== null && rowStart !== previousRow + rowSize) {
        const gap = document.createElement('span');
        gap.className = 'mem-gap';
        gap.textContent = `⋮  ${hex(previousRow + rowSize)}–${hex(rowStart - 1)} not shown  ⋮`;
        grid.appendChild(gap);
      }
      previousRow = rowStart;

      const label = document.createElement('span');
      label.className = 'mem-row';
      label.textContent = hex(rowStart);
      grid.appendChild(label);

      for (let col = 0; col < 16; col++) {
        const start = rowStart + col * cellSize;
        const el = document.createElement('div');
        el.className = 'mem-cell';
        el.style.setProperty('--i', rowIndex);
        el.dataset.index = this.#cells.length;
        grid.appendChild(el);
        this.#cells.push({ start, end: start + cellSize - 1, el });
      }
    });
  }

  #paint() {
    const focusRange = this.#focusRange();
    const isBytes = this.#zoom.level === BYTE_LEVEL;
    for (const cell of this.#cells) {
      const inside = this.#regionsIn(cell);
      const state = this.#cellState(cell, inside);
      cell.el.dataset.state = state;
      cell.el.dataset.mixed = String(inside.length > 1);
      cell.el.dataset.focus = String(Boolean(focusRange && overlap(focusRange, cell) > 0));
      cell.el.classList.toggle('selected', cell === this.#selected);
      if (isBytes) cell.el.textContent = this.#byteText(cell.start, state);
    }
    this.#renderTrail();
    this.#renderDetail();
  }

  // The strongest RAM state laid over any part of the cell, else its main region's state
  #cellState(cell, inside) {
    const overlays = this.#snapshot.overlays.filter((overlay) => overlap(overlay, cell) > 0);
    if (overlays.length) return overlays[overlays.length - 1].state;
    const main = inside.reduce((best, r) => (overlap(r, cell) > overlap(best, cell) ? r : best), inside[0]);
    return main ? main.state : 'off';
  }

  // Two hex digits when known, ?? for random RAM, ·· for contents not shown
  #byteText(address, state) {
    const value = this.#snapshot.readByte(address);
    if (typeof value === 'number') return hexByte(value);
    if (state === 'undefined' || state === 'tested') return '??';
    if (state === 'rom' || state === 'written') return '··';
    return '';
  }

  #renderTrail() {
    const { level, start } = this.#zoom;
    const steps = [{ label: 'Memory map', zoom: { level: 0, start: 0 } }];
    if (level >= 1) {
      const page = alignDown(start, LEVELS[0].cell);
      steps.push({ label: `Page ${hex(page)}`, zoom: { level: 1, start: page } });
    }
    if (level >= 2) {
      steps.push({ label: `Bytes ${hex(start)}–${hex(start + 0xFF)}`, zoom: { level: 2, start } });
    }

    this.#trail.replaceChildren();
    steps.forEach((step, i) => {
      if (i > 0) this.#trail.append(' › ');
      const isCurrent = i === steps.length - 1;
      const item = document.createElement(isCurrent ? 'span' : 'button');
      item.textContent = step.label;
      if (isCurrent) {
        item.setAttribute('aria-current', 'location');
      } else {
        item.type = 'button';
        item.addEventListener('click', () => this.#zoomTo(step.zoom));
      }
      this.#trail.appendChild(item);
    });
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
      if (!cell) return;
      const { level } = this.#zoom;
      if (level === 0) {
        this.#zoomTo({ level: 1, start: cell.start });
      } else if (level === 1) {
        this.#zoomTo({ level: 2, start: alignDown(cell.start, LEVELS[2].row * 16) });
      } else {
        this.#selected = cell === this.#selected ? null : cell;
        this.#paint();
      }
    });
  }

  #renderDetail() {
    const detail = this.#detail;
    detail.replaceChildren();
    const { level } = this.#zoom;
    const cell = this.#hovered || this.#selected;
    const focus = this.#snapshot.focus;
    const focusRegion = focus && this.#snapshot.regions.find((region) => region.id === focus.id);

    if (cell) {
      detail.appendChild(this.#line('mem-detail-title', this.#cellTitle(cell)));
      for (const region of this.#regionsIn(cell)) detail.appendChild(this.#regionLine(region));
    } else if (focusRegion) {
      detail.appendChild(this.#line('mem-detail-note', focus.note));
      detail.appendChild(this.#regionLine(focusRegion));
    } else {
      const hints = [
        'Each cell is a 4 KiB page. Row = address, column = next hex digit. Tap a cell to zoom in.',
        'Each cell is 16 bytes of this page. Tap a cell to see the bytes.',
        'Each cell is one byte. ?? = random RAM contents, ·· = contents not shown.',
      ];
      detail.appendChild(this.#line('mem-detail-hint', hints[level]));
    }
  }

  #cellTitle(cell) {
    if (this.#zoom.level === BYTE_LEVEL) {
      const state = this.#cellState(cell, this.#regionsIn(cell));
      const text = this.#byteText(cell.start, state) || '—';
      return `Byte ${hex(cell.start)} = ${text}`;
    }
    return `${hex(cell.start)}–${hex(cell.end)} · ${LEVELS[this.#zoom.level].unit}`;
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
