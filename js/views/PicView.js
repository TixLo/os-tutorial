// The interrupt controllers: two 8259A PICs, the master taking IRQ 0-7 and the slave
// IRQ 8-15 through the master's IRQ 2. Each input shows its device, whether the mask
// register (IMR) lets it through, and the interrupt number (vector) it becomes.
//
// pic: { imr: [master, slave], base: [master, slave] | null, active: irq | null, note }
// base null means the vectors are still the BIOS's.

const DEVICES = Object.freeze([
  'Timer', 'Keyboard', 'Slave PIC', 'Serial 2', 'Serial 1', 'Parallel 2', 'Floppy', 'Parallel 1',
  'Clock', '—', '—', '—', 'Mouse', 'Math unit', 'Disk 1', 'Disk 2',
]);
const BIOS_BASE = [0x08, 0x70];
const hex2 = (value) => '0x' + value.toString(16).toUpperCase().padStart(2, '0');

export class PicView {
  #root;
  #drawn = '';

  constructor(root = document.getElementById('pic-diagram')) {
    this.#root = root;
  }

  render(pic) {
    const key = JSON.stringify(pic || null);
    if (key === this.#drawn) return;
    this.#drawn = key;
    this.#root.replaceChildren();
    if (!pic) return;

    const base = pic.base || BIOS_BASE;
    const chips = document.createElement('div');
    chips.className = 'pic-chips';
    [['Master PIC', 'ports 0x20, 0x21'], ['Slave PIC', 'ports 0xA0, 0xA1']].forEach(([name, ports], chip) => {
      const box = document.createElement('div');
      box.className = 'pic-chip';
      const head = document.createElement('p');
      head.className = 'pic-head';
      head.textContent = `${name} · IMR ${hex2(pic.imr[chip])}`;
      const sub = document.createElement('p');
      sub.className = 'pic-sub';
      sub.textContent = `${ports} · inputs become INT ${hex2(base[chip])}–${hex2(base[chip] + 7)}`;
      box.append(head, sub);
      const list = document.createElement('ul');
      for (let pin = 0; pin < 8; pin++) {
        const irq = chip * 8 + pin;
        const open = !(pic.imr[chip] & (1 << pin));
        const item = document.createElement('li');
        item.dataset.open = String(open);
        if (pic.active === irq || (pic.active >= 8 && irq === 2)) item.classList.add('active');
        for (const [className, text] of [
          ['pic-irq', `IRQ ${irq}`],
          ['pic-dev', DEVICES[irq]],
          ['pic-mask', open ? 'open' : 'masked'],
          ['pic-vec', `→ ${hex2(base[chip] + pin)}`],
        ]) {
          const span = document.createElement('span');
          span.className = className;
          span.textContent = text;
          item.appendChild(span);
        }
        list.appendChild(item);
      }
      box.appendChild(list);
      chips.appendChild(box);
    });
    this.#root.appendChild(chips);

    const note = document.createElement('p');
    note.className = 'pic-note';
    note.textContent = pic.note || (pic.base ? 'Master output → CPU interrupt pin' :
      'Vectors are still the BIOS\'s: 0x08–0x0F and 0x70–0x77');
    this.#root.appendChild(note);
  }
}
