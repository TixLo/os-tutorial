const STATE_LABELS = Object.freeze({
  off: 'Off',
  undefined: 'Undefined',
  rom: 'ROM',
  unmapped: 'Unmapped',
});

const hex = (value) => '0x' + value.toString(16).toUpperCase().padStart(5, '0');

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  const kib = bytes / 1024;
  return (Number.isInteger(kib) ? kib : kib.toFixed(1)) + ' KiB';
}

// Draws the memory map. Rows are not to scale: height grows with log2(size)
// so a 512-byte boot sector stays visible next to 600 KiB of free RAM.
export class MemoryView {
  #container;
  #rows = new Map();  // region id -> row element

  constructor(container = document.getElementById('memory-map')) {
    this.#container = container;
  }

  render(regions) {
    if (this.#rows.size === 0) this.#build(regions);
    for (const region of regions) {
      const row = this.#rows.get(region.id);
      row.dataset.state = region.state;
      row.querySelector('.mem-state').textContent = STATE_LABELS[region.state];
    }
  }

  #build(regions) {
    regions.forEach((region, i) => {
      const size = region.end - region.start + 1;
      const row = document.createElement('div');
      row.className = 'mem-region';
      row.style.setProperty('--i', i);
      row.style.setProperty('--grow', Math.max(1, Math.log2(size) - 8).toFixed(2));
      row.innerHTML = `
        <span class="mem-range">${hex(region.start)}–${hex(region.end)}</span>
        <span class="mem-name"></span>
        <span class="mem-size">${formatSize(size)}</span>
        <span class="mem-state"></span>`;
      row.querySelector('.mem-name').textContent = region.name;
      this.#container.appendChild(row);
      this.#rows.set(region.id, row);
    });
  }
}
