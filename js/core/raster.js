// Turns a step's drawing list into the bytes of video memory. In graphics mode every
// pixel is one byte, a color number, stored row by row; the display and the memory panel
// both read the same bytes, so what the screen shows always matches memory.
//
// graphics: { width, height, ops } where each op is plain data:
//   { op: 'fill', color }                       every pixel
//   { op: 'box', color, x0, y0, x1, y1 }        a filled rectangle, corners included
//   { op: 'pattern', mask }                     pixel at offset i gets color i & mask
//   { op: 'text', x, y, color, text }           characters from the site font, 8 × 16 each
//   { op: 'bitmap', x, y, rows, colors }        rows of characters, each mapped to a color
//                                               number through `colors` (missing = skip)
// Later ops draw over earlier ones.

import { glyph, GLYPH_WIDTH, GLYPH_HEIGHT } from '../data/font.js';

const cache = new Map();
const CACHE_SIZE = 32;

function box(fb, width, height, { color, x0, y0, x1, y1 }) {
  const left = Math.max(0, x0);
  const right = Math.min(width - 1, x1);
  for (let y = Math.max(0, y0); y <= Math.min(height - 1, y1); y++) {
    fb.fill(color, y * width + left, y * width + right + 1);
  }
}

function text(fb, width, height, { x, y, color, text: string }) {
  [...string].forEach((ch, i) => {
    const rows = glyph(ch);
    const left = x + i * GLYPH_WIDTH;
    for (let row = 0; row < GLYPH_HEIGHT; row++) {
      const py = y + row;
      if (py < 0 || py >= height) continue;
      for (let bit = 0; bit < GLYPH_WIDTH; bit++) {
        const px = left + bit;
        if (px < 0 || px >= width) continue;
        if (rows[row] & (0x80 >> bit)) fb[py * width + px] = color;
      }
    }
  });
}

function bitmap(fb, width, height, { x, y, rows, colors }) {
  rows.forEach((line, row) => {
    const py = y + row;
    if (py < 0 || py >= height) return;
    [...line].forEach((ch, col) => {
      const px = x + col;
      const color = colors[ch];
      if (color === undefined || px < 0 || px >= width) return;
      fb[py * width + px] = color;
    });
  });
}

function draw(graphics) {
  const { width = 320, height = 200, ops = [] } = graphics;
  const fb = new Uint8Array(width * height);
  for (const op of ops) {
    switch (op.op) {
      case 'fill': fb.fill(op.color); break;
      case 'box': box(fb, width, height, op); break;
      case 'pattern': for (let i = 0; i < fb.length; i++) fb[i] = i & op.mask; break;
      case 'text': text(fb, width, height, op); break;
      case 'bitmap': bitmap(fb, width, height, op); break;
      default: throw new Error(`Unknown drawing op '${op.op}'`);
    }
  }
  return { width, height, pixels: fb };
}

// The pixels for a drawing list: { width, height, pixels: Uint8Array of color numbers }.
// Steps are revisited often, so recent results are kept.
export function rasterize(graphics) {
  const key = JSON.stringify(graphics);
  if (cache.has(key)) return cache.get(key);
  const result = draw(graphics);
  cache.set(key, result);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);
  return result;
}
