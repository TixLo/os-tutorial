// The TERMINAL tab. Until the OS has a console of its own (day 17), it works as a
// debugger attached to the machine: a step lists commands that look inside the machine
// and what they print, such as the bytes sent to an I/O port. From day 17 it can instead
// mirror the OS's console window, in type large enough to read.
//
// terminal: { lines: [text], console? } where a line starting with '>' is a command and
// the rest is output; console: true marks the OS console. null shows the placeholder.
export class TerminalView {
  #root;
  #log;
  #note;
  #title;
  #drawn = '';

  constructor(root = document.getElementById('terminal-body')) {
    this.#root = root;
    this.#note = root.querySelector('.term-note');
    this.#log = document.createElement('pre');
    this.#log.className = 'term-log';
    this.#title = document.createElement('p');
    this.#title.className = 'term-title';
    this.#title.textContent = 'OS console: the console window\'s text, shown larger';
    this.#note.after(this.#title, this.#log);
  }

  render(terminal) {
    const key = JSON.stringify(terminal || null);
    if (key === this.#drawn) return;
    this.#drawn = key;
    const lines = (terminal && terminal.lines) || [];
    const isConsole = Boolean(terminal && terminal.console);
    this.#root.classList.toggle('term-console', isConsole);
    this.#title.hidden = !isConsole;
    this.#note.hidden = lines.length > 0;
    this.#log.hidden = lines.length === 0;
    this.#log.replaceChildren();
    lines.forEach((line, i) => {
      const span = document.createElement('span');
      span.className = line.startsWith('>') ? 'term-cmd' : 'term-out';
      span.textContent = line;
      this.#log.append(span);
      if (i < lines.length - 1) this.#log.append('\n');
    });
    this.#root.scrollTop = this.#root.scrollHeight;
  }
}
