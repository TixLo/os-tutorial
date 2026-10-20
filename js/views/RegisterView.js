import { EventEmitter } from '../core/EventEmitter.js';

const hexValue = (text) => (/^[0-9A-F]+$/i.test(text) ? parseInt(text, 16) : null);
const hex = (value) => '0x' + value.toString(16).toUpperCase();

// CPU register table. Values that changed since the previous step are highlighted.
// CS base and EIP are links: CS base is an address itself, and CS base + EIP is where
// the next instruction is.
// Events: 'locate' (physical address)
export class RegisterView extends EventEmitter {
  #body;
  #empty;

  constructor(root = document.getElementById('registers')) {
    super();
    this.#body = root.querySelector('tbody');
    this.#empty = root.querySelector('.regs-empty');
  }

  render(regs, previousRegs, cpu) {
    this.#body.replaceChildren();
    const hasRegs = Boolean(regs);
    this.#body.parentElement.hidden = !hasRegs;
    this.#empty.hidden = hasRegs;
    if (!hasRegs) {
      this.#empty.textContent = cpu === 'off'
        ? 'The CPU has no power. Its registers hold nothing.'
        : 'The CPU is frozen by RESET#. Its registers are not set yet.';
      return;
    }

    const links = this.#addressLinks(regs);
    for (const [name, { value, note }] of Object.entries(regs)) {
      const changed = previousRegs && previousRegs[name] && previousRegs[name].value !== value;
      const row = document.createElement('tr');
      if (changed) row.className = 'changed';
      row.append(
        this.#cell('reg-name', name),
        this.#cell('reg-value', value, links[name]),
        this.#cell('reg-note', note),
      );
      this.#body.appendChild(row);
    }
  }

  // Registers whose value points at memory: { name: { address, title } }
  #addressLinks(regs) {
    const base = regs['CS base'] && hexValue(regs['CS base'].value);
    const eip = regs['EIP'] && hexValue(regs['EIP'].value);
    const links = {};
    if (base !== null && base !== undefined) {
      links['CS base'] = { address: base, title: `Show ${hex(base)} in memory` };
      if (eip !== null && eip !== undefined) {
        const next = base + eip;
        links['EIP'] = {
          address: next,
          title: `Next instruction: CS base + EIP = ${hex(next)}. Show it in memory`,
        };
      }
    }
    return links;
  }

  #cell(className, text, link) {
    const cell = document.createElement('td');
    cell.className = className;
    if (!link) {
      cell.textContent = text;
      return cell;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'addr-link';
    button.textContent = text;
    button.title = link.title;
    button.addEventListener('click', () => this.emit('locate', link.address));
    cell.appendChild(button);
    return cell;
  }
}
