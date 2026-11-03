// The TERMINAL tab. Until the OS has a console of its own (day 17), it works as a
// debugger attached to the machine: a step lists commands that look inside the machine
// and what they print, such as the bytes sent to an I/O port.
//
// terminal: { lines: [text] } where a line starting with '> ' is a command and the rest
// is output; null shows the placeholder.
export class TerminalView {
  #root;
  #log;
  #note;
  #drawn = '';

  constructor(root = document.getElementById('terminal-body')) {
    this.#root = root;
    this.#note = root.querySelector('.term-note');
    this.#log = document.createElement('pre');
    this.#log.className = 'term-log';
    this.#note.after(this.#log);
  }

  render(terminal) {
    const key = JSON.stringify(terminal || null);
    if (key === this.#drawn) return;
    this.#drawn = key;
    const lines = (terminal && terminal.lines) || [];
    this.#note.hidden = lines.length > 0;
    this.#log.hidden = lines.length === 0;
    this.#log.replaceChildren();
    lines.forEach((line, i) => {
      const span = document.createElement('span');
      span.className = line.startsWith('> ') ? 'term-cmd' : 'term-out';
      span.textContent = line;
      this.#log.append(span);
      if (i < lines.length - 1) this.#log.append('\n');
    });
    this.#root.scrollTop = this.#root.scrollHeight;
  }
}
