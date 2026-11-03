import { rasterize } from '../core/raster.js';
import { PALETTES } from '../data/palettes.js';

const COLUMNS = 80;
const ROWS = 25;
const CHAR_WIDTH_EM = 0.6;   // monospace glyph width relative to the font size
const MIN_FONT_PX = 9;       // keep text readable; the panel scrolls if rows don't fit
const MAX_FONT_PX = 16;

// The monitor. Before the BIOS sets up the video card there is nothing to show, so it
// displays the monitor's own "no signal" message. In text mode it shows the 80 x 25
// character screen, scaled so all 80 columns fit the panel's width. In graphics mode
// (320 x 200, from day 3) it draws video memory through the palette: each byte is a
// color number, and the palette says which color that number is.
export class DisplayView {
  #root;
  #screen;
  #canvas;
  #drawn = '';

  constructor(root = document.getElementById('monitor')) {
    this.#root = root;
    this.#screen = document.createElement('pre');
    this.#screen.className = 'text-screen';
    this.#screen.setAttribute('aria-label', 'Text screen');
    this.#canvas = document.createElement('canvas');
    this.#canvas.className = 'graphics-screen';
    this.#canvas.setAttribute('role', 'img');
    root.append(this.#screen, this.#canvas);
    new ResizeObserver(() => this.#fit()).observe(root);
  }

  // monitor: 'off' | 'nosignal' | 'text' | 'graphics'; screen: lines of text;
  // cursor: [row, column], or null for the start of the line after the text;
  // graphics: drawing list (see core/raster.js); palette: 'vga' | 'os'
  render({ monitor, screen, cursor, graphics, palette }) {
    this.#root.dataset.monitor = monitor;
    if (monitor === 'graphics') {
      this.#draw(graphics || { ops: [] }, palette || 'vga');
      return;
    }
    this.#fit();
    const lines = Array.from({ length: ROWS }, (_, row) => (screen[row] || '').padEnd(COLUMNS));
    const [cursorRow, cursorCol] = cursor || [Math.min(screen.length, ROWS - 1), 0];
    this.#screen.replaceChildren();
    lines.forEach((line, row) => {
      if (row === cursorRow) {
        const mark = document.createElement('span');
        mark.className = 'text-cursor';
        mark.textContent = '_';
        this.#screen.append(line.slice(0, cursorCol), mark, line.slice(cursorCol + 1));
      } else {
        this.#screen.append(line);
      }
      if (row < ROWS - 1) this.#screen.append('\n');
    });
  }

  #draw(graphics, paletteId) {
    const key = paletteId + JSON.stringify(graphics);
    if (key === this.#drawn) return;
    this.#drawn = key;
    const { width, height, pixels } = rasterize(graphics);
    const canvas = this.#canvas;
    canvas.width = width;
    canvas.height = height;
    canvas.setAttribute('aria-label', `Graphics screen, ${width} by ${height} pixels`);
    const palette = PALETTES[paletteId].map((rgb) => [1, 3, 5].map((i) => parseInt(rgb.slice(i, i + 2), 16)));
    const context = canvas.getContext('2d');
    const image = context.createImageData(width, height);
    for (let i = 0; i < pixels.length; i++) {
      const [r, g, b] = palette[pixels[i]];
      image.data.set([r, g, b, 255], i * 4);
    }
    context.putImageData(image, 0, 0);
  }

  #fit() {
    const style = getComputedStyle(this.#root);
    const width = this.#root.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const size = Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, width / (COLUMNS * CHAR_WIDTH_EM)));
    this.#screen.style.fontSize = `${size}px`;
  }
}
