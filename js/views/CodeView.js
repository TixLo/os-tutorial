import { EventEmitter } from '../core/EventEmitter.js';

const MAX_BYTES_SHOWN = 6;

const hex = (value) => '0x' + value.toString(16).toUpperCase().padStart(5, '0');
const hexByte = (value) => value.toString(16).toUpperCase().padStart(2, '0');

// Bytes column: up to a few bytes, or "00 × 386" for a run of padding
function bytesText(bytes) {
  if (!bytes.length) return '';
  if (bytes.length > MAX_BYTES_SHOWN && bytes.every((b) => b === bytes[0])) {
    return `${hexByte(bytes[0])} × ${bytes.length}`;
  }
  const shown = bytes.slice(0, MAX_BYTES_SHOWN).map(hexByte).join(' ');
  return bytes.length > MAX_BYTES_SHOWN ? `${shown} …` : shown;
}

// Program listing: one row per line with its address, bytes, source, and comment.
// The step's focus range is highlighted, and ▶ marks the instruction the CPU runs next.
// Events: 'locate' (address) when a row is tapped.
export class CodeView extends EventEmitter {
  #root;
  #program = null;
  #rows = [];   // { line, el }

  constructor(root = document.getElementById('code-body')) {
    super();
    this.#root = root;
  }

  // program: assembled program or null; focus: [start, end] or null; pc: address or null
  render({ program, focus, pc }) {
    if (program !== this.#program) this.#build(program);
    if (!program) return;

    let scrollTo = null;
    for (const { line, el } of this.#rows) {
      const size = (line.bytes || []).length;  // labels and org take no bytes
      const end = line.address + size - 1;
      const inFocus = Boolean(focus) && size > 0 && line.address <= focus[1] && end >= focus[0];
      const isCurrent = pc !== null && size > 0 && line.address === pc;
      el.classList.toggle('focus', inFocus);
      el.classList.toggle('current', isCurrent);
      if ((inFocus && !scrollTo) || (isCurrent && !focus)) scrollTo = el;
    }
    if (scrollTo) this.#scrollToRow(scrollTo);
  }

  // Center a row inside the code panel without scrolling the page around it
  #scrollToRow(row) {
    const root = this.#root;
    const offset = row.getBoundingClientRect().top - root.getBoundingClientRect().top;
    const top = root.scrollTop + offset - (root.clientHeight - row.offsetHeight) / 2;
    root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  #build(program) {
    this.#program = program;
    this.#rows = [];
    this.#root.replaceChildren();
    if (!program) {
      const empty = document.createElement('p');
      empty.className = 'code-empty';
      empty.textContent = 'No code to show yet. So far only the BIOS has run, and its ' +
        'code lives in ROM.';
      this.#root.appendChild(empty);
      return;
    }

    const file = document.createElement('div');
    file.className = 'code-file';
    file.textContent = `${program.name} · ${program.size} bytes at ${hex(program.origin)}`;
    const table = document.createElement('table');
    table.className = 'code-lines';
    const body = document.createElement('tbody');
    table.appendChild(body);

    for (const line of program.lines) {
      const row = document.createElement('tr');
      if (line.label) row.className = 'code-label';
      const cells = line.label
        ? ['', hex(line.address), '', `${line.label}:`, '']
        : ['', hex(line.address), bytesText(line.bytes), `    ${line.source}`, line.comment ? `; ${line.comment}` : ''];
      ['code-mark', 'code-addr', 'code-bytes', 'code-src', 'code-note'].forEach((className, i) => {
        const cell = document.createElement('td');
        cell.className = className;
        cell.textContent = cells[i];
        row.appendChild(cell);
      });
      row.addEventListener('click', () => this.emit('locate', line.address));
      body.appendChild(row);
      this.#rows.push({ line, el: row });
    }
    this.#root.append(file, table);
  }
}
