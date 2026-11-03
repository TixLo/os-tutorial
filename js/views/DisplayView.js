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
  #marks;
  #markList = [];
  #drawn = '';

  constructor(root = document.getElementById('monitor')) {
    this.#root = root;
    this.#screen = document.createElement('pre');
    this.#screen.className = 'text-screen';
    this.#screen.setAttribute('aria-label', 'Text screen');
    this.#canvas = document.createElement('canvas');
    this.#canvas.className = 'graphics-screen';
    this.#canvas.setAttribute('role', 'img');
    this.#marks = document.createElement('div');
    this.#marks.className = 'screen-marks';
    this.#marks.setAttribute('aria-hidden', 'true');
    root.append(this.#screen, this.#canvas, this.#marks);
    new ResizeObserver(() => {
      this.#fit();
      this.#placeMarks();
    }).observe(root);
  }

  // monitor: 'off' | 'nosignal' | 'text' | 'graphics'; screen: lines of text;
  // cursor: [row, column], or null for the start of the line after the text;
  // graphics: drawing list (see core/raster.js); palette: 'vga' | 'os';
  // marks: rectangles to outline on the graphics screen, [{ x0, y0, x1, y1 }], such as
  // the area a step redraws. They are drawn over the screen, not into video memory.
  render({ monitor, screen, cursor, graphics, palette, marks }) {
    this.#root.dataset.monitor = monitor;
    this.#markList = monitor === 'graphics' ? marks || [] : [];
    if (monitor === 'graphics') {
      this.#draw(graphics || { ops: [] }, palette || 'vga');
      this.#placeMarks();
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

  // Outline each mark where its pixels appear in the scaled, letterboxed canvas
  #placeMarks() {
    const marks = this.#markList;
    this.#marks.replaceChildren();
    if (!marks.length) return;
    const canvas = this.#canvas;
    const scale = Math.min(canvas.clientWidth / canvas.width, canvas.clientHeight / canvas.height);
    const left = canvas.offsetLeft + (canvas.clientWidth - canvas.width * scale) / 2;
    const top = canvas.offsetTop + (canvas.clientHeight - canvas.height * scale) / 2;
    for (const { x0, y0, x1, y1 } of marks) {
      const box = document.createElement('div');
      box.className = 'screen-mark';
      box.style.left = `${left + x0 * scale}px`;
      box.style.top = `${top + y0 * scale}px`;
      box.style.width = `${(x1 - x0 + 1) * scale}px`;
      box.style.height = `${(y1 - y0 + 1) * scale}px`;
      this.#marks.appendChild(box);
    }
  }

  #fit() {
    const style = getComputedStyle(this.#root);
    const width = this.#root.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const size = Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, width / (COLUMNS * CHAR_WIDTH_EM)));
    this.#screen.style.fontSize = `${size}px`;
  }
}
