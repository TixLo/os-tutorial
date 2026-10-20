const STATE_LABELS = Object.freeze({
  off: 'Off',
  undefined: 'Undefined',
  rom: 'ROM',
  unmapped: 'Unmapped',
});

const ONE_MIB = 0x100000;

const hex = (value) =>
  '0x' + value.toString(16).toUpperCase().padStart(value < ONE_MIB ? 5 : 8, '0');

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
      row.dataset.focus = String(Boolean(region.note));
      row.querySelector('.mem-state').textContent = STATE_LABELS[region.state];
      row.querySelector('.mem-note').textContent = region.note || '';
      if (region.note) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  #build(regions) {
    regions.forEach((region, i) => {
      const previous = regions[i - 1];
      if (previous && region.start > previous.end + 1) {
        this.#container.appendChild(this.#gap(previous.end + 1, region.start));
      }

      const size = region.end - region.start + 1;
      const row = document.createElement('div');
      row.className = 'mem-region';
      row.style.setProperty('--i', i);
      row.style.setProperty('--grow', Math.max(1, Math.log2(size) - 8).toFixed(2));
      row.innerHTML = `
        <span class="mem-range">${hex(region.start)}–${hex(region.end)}</span>
        <span class="mem-name"><span class="mem-label"></span><span class="mem-note"></span></span>
        <span class="mem-size">${formatSize(size)}</span>
        <span class="mem-state"></span>`;
      row.querySelector('.mem-label').textContent = region.name;
      this.#container.appendChild(row);
      this.#rows.set(region.id, row);
    });
  }

  #gap(start, end) {
    const gap = document.createElement('div');
    gap.className = 'mem-gap';
    gap.textContent = `⋮  ${hex(start)}–${hex(end - 1)} not shown  ⋮`;
    return gap;
  }
}
