const COLUMNS = 80;
const ROWS = 25;
const CHAR_WIDTH_EM = 0.6;   // monospace glyph width relative to the font size
const MIN_FONT_PX = 9;       // keep text readable; the panel scrolls if rows don't fit
const MAX_FONT_PX = 16;

// The monitor. Before the BIOS sets up the video card there is nothing to show, so it
// displays the monitor's own "no signal" message. In text mode it shows the 80 x 25
// character screen, scaled so all 80 columns fit the panel's width.
export class DisplayView {
  #root;
  #screen;

  constructor(root = document.getElementById('monitor')) {
    this.#root = root;
    this.#screen = document.createElement('pre');
    this.#screen.className = 'text-screen';
    this.#screen.setAttribute('aria-label', 'Text screen');
    root.appendChild(this.#screen);
    new ResizeObserver(() => this.#fit()).observe(root);
  }

  // monitor: 'off' | 'nosignal' | 'text'; screen: lines of text
  render({ monitor, screen }) {
    this.#root.dataset.monitor = monitor;
    this.#fit();
    const lines = Array.from({ length: ROWS }, (_, row) => (screen[row] || '').padEnd(COLUMNS));
    // The BIOS leaves its cursor on the line after the last text
    const cursorRow = Math.min(screen.length, ROWS - 1);
    this.#screen.replaceChildren();
    lines.forEach((line, row) => {
      if (row === cursorRow) {
        const cursor = document.createElement('span');
        cursor.className = 'text-cursor';
        cursor.textContent = '_';
        this.#screen.append(cursor, line.slice(1));
      } else {
        this.#screen.append(line);
      }
      if (row < ROWS - 1) this.#screen.append('\n');
    });
  }

  #fit() {
    const style = getComputedStyle(this.#root);
    const width = this.#root.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const size = Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, width / (COLUMNS * CHAR_WIDTH_EM)));
    this.#screen.style.fontSize = `${size}px`;
  }
}
