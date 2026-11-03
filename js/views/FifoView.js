// A ring buffer (FIFO) drawn as a row of slots, with the next write and next read
// positions marked. The kernel uses these to pass bytes from interrupt handlers to the
// main loop.
//
// fifo: { title, size, slots: [value | null], write, read, note }
// Values are bytes shown in hex; null is an empty slot. Only the first 32 slots are
// drawn; a note says so for bigger buffers.

const MAX_SLOTS = 32;
const hex2 = (value) => value.toString(16).toUpperCase().padStart(2, '0');

export class FifoView {
  #root;
  #drawn = '';

  constructor(root = document.getElementById('fifo-diagram')) {
    this.#root = root;
  }

  render(fifo) {
    const key = JSON.stringify(fifo || null);
    if (key === this.#drawn) return;
    this.#drawn = key;
    this.#root.replaceChildren();
    if (!fifo) return;

    const title = document.createElement('p');
    title.className = 'fifo-title';
    title.textContent = fifo.title;
    const row = document.createElement('div');
    row.className = 'fifo-slots';
    const shown = Math.min(fifo.size, MAX_SLOTS);
    for (let i = 0; i < shown; i++) {
      const value = fifo.slots[i];
      const slot = document.createElement('div');
      slot.className = 'fifo-slot';
      slot.dataset.full = String(value !== null && value !== undefined);
      const byte = document.createElement('span');
      byte.className = 'fifo-byte';
      byte.textContent = value === null || value === undefined ? '··' : hex2(value);
      const index = document.createElement('span');
      index.className = 'fifo-index';
      index.textContent = String(i);
      const marks = document.createElement('span');
      marks.className = 'fifo-marks';
      marks.textContent = [i === fifo.write ? 'w' : '', i === fifo.read ? 'r' : ''].filter(Boolean).join(' ');
      slot.append(index, byte, marks);
      row.appendChild(slot);
    }
    this.#root.append(title, row);

    const notes = [];
    if (fifo.size > MAX_SLOTS) notes.push(`First ${MAX_SLOTS} of ${fifo.size} slots shown.`);
    notes.push('w = next write (interrupt handler) · r = next read (main loop)');
    if (fifo.note) notes.push(fifo.note);
    const note = document.createElement('p');
    note.className = 'fifo-note';
    note.textContent = notes.join(' ');
    this.#root.appendChild(note);
  }
}
