// CPU register table. Values that changed since the previous step are highlighted.
export class RegisterView {
  #body;
  #empty;

  constructor(root = document.getElementById('registers')) {
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

    for (const [name, { value, note }] of Object.entries(regs)) {
      const changed = previousRegs && previousRegs[name] && previousRegs[name].value !== value;
      const row = document.createElement('tr');
      if (changed) row.className = 'changed';
      for (const [text, className] of [[name, 'reg-name'], [value, 'reg-value'], [note, 'reg-note']]) {
        const cell = document.createElement('td');
        cell.className = className;
        cell.textContent = text;
        row.appendChild(cell);
      }
      this.#body.appendChild(row);
    }
  }
}
