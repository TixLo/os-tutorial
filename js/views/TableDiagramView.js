// A table diagram in the explanation panel, drawn from step data. Many things the OS sets
// up are tables (the palette, the IDT, the PIC's registers, the memory manager's free
// list, ...), so one view draws them all.
//
// table: { title, head: [text], rows: [{ cells, focus?, dim? }], note? }
// A cell is text, or { text, swatch: '#RRGGBB' } for a color sample before the text.
export class TableDiagramView {
  #root;
  #drawn = '';

  constructor(root = document.getElementById('table-diagram')) {
    this.#root = root;
  }

  render(table) {
    const key = JSON.stringify(table || null);
    if (key === this.#drawn) return;
    this.#drawn = key;
    this.#root.replaceChildren();
    if (!table) return;

    const title = document.createElement('p');
    title.className = 'td-title';
    title.textContent = table.title;
    const wrap = document.createElement('div');
    wrap.className = 'td-scroll';
    const element = document.createElement('table');
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const text of table.head) {
      const th = document.createElement('th');
      th.textContent = text;
      headRow.appendChild(th);
    }
    head.appendChild(headRow);
    const body = document.createElement('tbody');
    for (const row of table.rows) {
      const tr = document.createElement('tr');
      if (row.focus) tr.className = 'focus';
      if (row.dim) tr.classList.add('dim');
      for (const cell of row.cells) tr.appendChild(this.#cell(cell));
      body.appendChild(tr);
    }
    element.append(head, body);
    wrap.appendChild(element);
    this.#root.append(title, wrap);
    if (table.note) {
      const note = document.createElement('p');
      note.className = 'td-note';
      note.textContent = table.note;
      this.#root.appendChild(note);
    }
  }

  #cell(cell) {
    const td = document.createElement('td');
    if (cell && typeof cell === 'object') {
      if (cell.swatch) {
        const swatch = document.createElement('span');
        swatch.className = 'td-swatch';
        swatch.style.background = cell.swatch;
        td.appendChild(swatch);
      }
      td.append(cell.text || '');
    } else {
      td.textContent = cell === undefined || cell === null ? '' : String(cell);
    }
    return td;
  }
}
