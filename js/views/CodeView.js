import { EventEmitter } from '../core/EventEmitter.js';

const MAX_BYTES_SHOWN = 6;

const hex = (value) => '0x' + value.toString(16).toUpperCase().padStart(5, '0');
const hexByte = (value) => value.toString(16).toUpperCase().padStart(2, '0');

// Bytes column: up to a few bytes, or "00 × 386" for a run of padding
function bytesText(bytes) {
  if (!bytes || !bytes.length) return '';
  if (bytes.length > MAX_BYTES_SHOWN && bytes.every((b) => b === bytes[0])) {
    return `${hexByte(bytes[0])} × ${bytes.length}`;
  }
  const shown = bytes.slice(0, MAX_BYTES_SHOWN).map(hexByte).join(' ');
  return bytes.length > MAX_BYTES_SHOWN ? `${shown} …` : shown;
}

// Program listing: one row per line with its address, bytes, source, and comment.
// Assembled programs (with addresses) are focused by address range and the next
// instruction is found from CS:EIP. Simplified teaching programs have no addresses and
// only some bytes; their lines are focused by tag, and a step names the current tag.
// Events: 'locate' (address) when a row with an address is tapped.
export class CodeView extends EventEmitter {
  #root;
  #program = null;
  #rows = [];   // { line, el }

  constructor(root = document.getElementById('code-body')) {
    super();
    this.#root = root;
  }

  // program: program or null; focus: [start, end] addresses, a list of tags, or null;
  // pc: address of the next instruction or null; current: tag of the next line or null
  render({ program, focus, pc, current }) {
    if (program !== this.#program) this.#build(program);
    if (!program) return;

    const byTag = Array.isArray(focus) && typeof focus[0] === 'string';
    let scrollTo = null;
    let marked = false;
    for (const { line, el } of this.#rows) {
      const size = (line.bytes || []).length;  // labels and org take no bytes
      let inFocus;
      let isCurrent;
      if (program.illustrative) {
        inFocus = byTag && Boolean(line.tag) && focus.includes(line.tag);
        isCurrent = !marked && Boolean(current) && line.tag === current;
      } else {
        const end = line.address + size - 1;
        inFocus = Boolean(focus) && !byTag && size > 0 && line.address <= focus[1] && end >= focus[0];
        isCurrent = pc !== null && size > 0 && line.address === pc;
      }
      if (isCurrent) marked = true;
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
    file.textContent = program.illustrative
      ? `${program.name} · simplified for teaching`
      : `${program.name} · ${program.size} bytes at ${hex(program.origin)}`;
    const table = document.createElement('table');
    table.className = 'code-lines';
    table.classList.toggle('no-addresses', Boolean(program.illustrative));
    const body = document.createElement('tbody');
    table.appendChild(body);

    for (const line of program.lines) {
      const row = document.createElement('tr');
      if (line.label) row.className = 'code-label';
      if (line.heading) row.className = 'code-heading';
      const address = line.address === undefined ? '' : hex(line.address);
      const cells = line.heading ? ['', '', '', `; ${line.heading}`, '']
        : line.label ? ['', address, '', `${line.label}:`, '']
        : ['', address, bytesText(line.bytes), `    ${line.source}`, line.comment ? `; ${line.comment}` : ''];
      ['code-mark', 'code-addr', 'code-bytes', 'code-src', 'code-note'].forEach((className, i) => {
        const cell = document.createElement('td');
        cell.className = className;
        cell.textContent = cells[i];
        row.appendChild(cell);
      });
      if (line.address !== undefined) {
        row.addEventListener('click', () => this.emit('locate', line.address));
      } else {
        row.classList.add('no-link');
      }
      body.appendChild(row);
      this.#rows.push({ line, el: row });
    }
    this.#root.append(file, table);
  }
}
