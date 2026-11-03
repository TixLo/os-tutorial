// Day 11: the cursor may leave the screen's edges, a window becomes a third layer, a
// counter in the window shows how fast the CPU runs, and a map of which layer owns each
// pixel stops the flicker that fast redrawing causes.
// The programs are simplified teaching code (see js/data/programs/day11.js).

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { screen320, windowOps, textOn } from '../screens.js';
import { cursorAt, CURSOR_SHAPE } from './day05.js';
import { DAY_10, background } from './day10.js';

const PHASES = Object.freeze({
  A: 'A window',
  B: 'A counter, and flicker',
});

const DAY_10_END = finalState(DAY_10.steps);

const reg = (value, note) => ({ value, note });
const hex = (value, width = 8) => '0x' + value.toString(16).toUpperCase().padStart(width, '0');
const IN_MAIN = reg('0000C3··', 'In kernel_main');

// Today's kernel allocates, in order: the control block, the map, the background, the
// window
const CTL = 0x400000;
const MAP = 0x403000;
const BACK = 0x413000;
const WIN = 0x423000;
const LAYOUT = [
  ...DAY_10_END.memory.layout.filter((region) => region.id !== 'os_shtctl' && region.id !== 'os_backbuf'),
  { id: 'os_shtctl', start: CTL, end: MAP - 1, name: 'Layer control block (SHTCTL)', kind: 'ram' },
  { id: 'os_map', start: MAP, end: BACK - 1, name: 'Layer map: which layer shows at each pixel', kind: 'ram' },
  { id: 'os_backbuf', start: BACK, end: WIN - 1, name: 'Background layer\'s pixels', kind: 'ram' },
  { id: 'os_winbuf', start: WIN, end: WIN + 0x3000 - 1, name: 'Window layer\'s pixels (160 × 68)', kind: 'ram' },
];

const WIN_X = 140;
const WIN_Y = 40;
const windowLayer = (lines) => [
  ...windowOps(WIN_X, WIN_Y, 160, 68, 'window'),
  ...lines.flatMap(([x, y, text]) => textOn(WIN_X + x, WIN_Y + y, text)),
];
const WELCOME = [[24, 28, 'Welcome to'], [24, 44, 'my own OS!']];
const counter = (n) => [[40, 28, String(n).padStart(10, '0')]];

const screen = (mx, my, winLines = null) => screen320([
  ...background(mx, my),
  ...(winLines ? windowLayer(winLines) : []),
  cursorAt(mx, my),
]);

// The map: 0 = background, 1 = window, 2 = mouse, for each pixel
const mapAt = (mx, my) => ({
  start: MAP, end: MAP + 64000 - 1,
  graphics: screen320([
    { op: 'fill', color: 0 },
    { op: 'box', color: 1, x0: WIN_X, y0: WIN_Y, x1: WIN_X + 159, y1: WIN_Y + 67 },
    { op: 'bitmap', x: mx, y: my, rows: CURSOR_SHAPE, colors: { '*': 2, O: 2 } },
  ]),
});

const LAYER_TABLE = (mouse, note) => ({
  title: 'Layers, top to bottom',
  head: ['Height', 'Layer', 'Size', 'At', 'Pixels at'],
  rows: [
    { cells: ['2', 'Mouse', '16 × 16', `(${mouse[0]}, ${mouse[1]})`, 'buf_mouse'] },
    { cells: ['1', 'Window', '160 × 68', `(${WIN_X}, ${WIN_Y})`, hex(WIN)], focus: true },
    { cells: ['0', 'Background', '320 × 200', '(0, 0)', hex(BACK)] },
  ],
  note,
});

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 10 stopped',
    summary: 'The background and the cursor are separate layers. Next comes the thing an OS ' +
      'with layers is for: a window.',
    detail: 'First a small fix: the cursor can\'t reach the right or bottom edge, because ' +
      'day 8 stopped it 16 pixels early to keep the whole picture on screen. Then a window ' +
      'layer, and a counter that puts the layer code under real pressure.',
    time: '≈ 20 s',
    state: {
      ...DAY_10_END,
      regs: { ...DAY_10_END.regs, 'EIP': IN_MAIN },
      tab: 'code',
      visual: 'none',
      table: null,
      marks: null,
      terminal: null,
      code: { program: 'day10Main', focus: ['move'], current: 'move', trace: true },
      memory: { ...DAY_10_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Up to the edge',
    summary: 'The cursor may now go right up to the last pixel, with part of its picture off ' +
      'the screen.',
    detail: 'The limits become scrnx − 1 and scrny − 1. Drawing must then stop at the ' +
      'screen\'s edges: a row that ran past the right edge would continue on the left of the ' +
      'next row down, since video memory is one long line of bytes. sheet_refreshsub clips ' +
      'every rectangle to the screen first.',
    formula: 'pixel (320, y) would be byte y × 320 + 320 = the first pixel of row y + 1',
    time: '≈ 21 s',
    state: {
      graphics: screen(310, 190),
      marks: [{ x0: 310, y0: 190, x1: 319, y1: 199 }],
      regs: { 'EAX': reg('00000136', 'mx = 310'), 'ECX': reg('000000BE', 'my = 190') },
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Draw a window',
    summary: 'make_window draws a frame, a face, a title bar, and a close button into a new ' +
      'layer\'s buffer, which goes between the background and the mouse.',
    detail: 'A window is just another layer, 160 × 68 here, at (140, 40). Light and dark ' +
      'lines make its frame look raised, like the taskbar button. The close button is a ' +
      'small picture, drawn the same way as the cursor. Heights are now 0 for the ' +
      'background, 1 for the window, 2 for the mouse.',
    time: '≈ 21 s',
    state: {
      tab: 'memory',
      graphics: screen(200, 150, WELCOME),
      marks: null,
      code: { program: 'day11Window', focus: ['make', 'frame', 'titlebar', 'closedraw', 'sheet', 'text', 'order'], current: null },
      visual: 'table',
      table: LAYER_TABLE([200, 150], 'New today: the window, at height 1.'),
      regs: { 'EAX': reg('000000C8', 'mx = 200'), 'ECX': reg('00000096', 'my = 150') },
      memory: { layout: LAYOUT, focus: { id: 'os_winbuf', note: 'The window\'s own pixels' } },
      ranges: { ctl: { start: CTL, end: MAP - 1, state: 'written' } },
      writes: {
        backBuf: { start: BACK, end: BACK + 64000 - 1, graphics: screen320(background(200, 150)) },
        winBuf: { start: WIN, end: WIN + 160 * 68 - 1, graphics: { width: 160, height: 68, ops: [...windowOps(0, 0, 160, 68, 'window'), ...WELCOME.flatMap(([x, y, t]) => textOn(x, y, t))] } },
      },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'Count as fast as possible',
    summary: 'The main loop stops sleeping: it adds 1 to a counter, writes the number into ' +
      'the window, and refreshes that rectangle, over and over.',
    detail: 'This shows how much the CPU can do between interrupts, and it stresses the layer ' +
      'code: the rectangle is redrawn thousands of times a second. Keyboard and mouse still ' +
      'work, checked on every pass of the loop.',
    time: '≈ 23 s',
    state: {
      tab: 'code',
      graphics: screen(200, 150, counter(1873455)),
      marks: [{ x0: WIN_X + 40, y0: WIN_Y + 28, x1: WIN_X + 119, y1: WIN_Y + 43 }],
      code: { program: 'day11Counter', focus: ['loop', 'count', 'draw', 'refresh'], current: 'count' },
      table: LAYER_TABLE([200, 150], 'Only the counter\'s rectangle is redrawn.'),
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Flicker',
    summary: 'The number flickers. Each refresh first copies the background into the ' +
      'rectangle, then the window over it, so for a moment the background shows.',
    detail: 'Copying starts at height 0, so every pass paints teal into the counter\'s box ' +
      'before the window\'s gray and black go on top. With an opaque window, the layers ' +
      'below can never show there, so the fix is to start at the changed layer\'s own height ' +
      '(h0). The number stops flickering.',
    time: '≈ 23 s',
    state: {
      code: { program: 'day11Map', focus: ['h0'], current: null },
      graphics: screen320([
        ...background(200, 150),
        ...windowLayer(counter(1873455)),
        { op: 'box', color: C.teal, x0: WIN_X + 40, y0: WIN_Y + 28, x1: WIN_X + 119, y1: WIN_Y + 43 },
        cursorAt(200, 150),
      ]),
      table: LAYER_TABLE([200, 150], 'A moment mid-refresh: the background copied, the window not yet.'),
    },
  },
  {
    id: 'B3',
    phase: 'B',
    title: 'The cursor flickers too',
    summary: 'With the cursor over the counter, refreshing the window wipes the cursor, which ' +
      'is then drawn again, again and again.',
    detail: 'The window\'s refresh paints the window\'s pixels everywhere in the rectangle, ' +
      'including under the cursor, and then the mouse layer is copied back on top. The ' +
      'cure is a map, one byte per screen pixel, saying which layer is visible there. Each ' +
      'layer then writes only the pixels the map gives it, and a refresh of the window ' +
      'stops at the window\'s height (h1).',
    time: '≈ 24 s',
    state: {
      graphics: screen320([
        ...background(186, 70),
        ...windowLayer(counter(2210846)),
      ]),
      marks: [{ x0: WIN_X + 40, y0: WIN_Y + 28, x1: WIN_X + 119, y1: WIN_Y + 43 }],
      table: LAYER_TABLE([186, 70], 'A moment mid-refresh: the window drawn over the cursor.'),
      regs: { 'EAX': reg('000000BA', 'mx = 186'), 'ECX': reg('00000046', 'my = 70') },
    },
  },
  {
    id: 'B4',
    phase: 'B',
    title: 'A map of who shows where',
    summary: 'The map holds 0, 1, or 2 for each pixel: background, window, or mouse. It is ' +
      'rebuilt only where a layer moves or changes height.',
    detail: 'sheet_refreshmap fills the map from the bottom layer up, skipping see-through ' +
      'pixels, so the top visible layer wins at each pixel. sheet_refreshsub then copies a ' +
      'pixel only if the map names this layer. Every pixel of the screen is written at most ' +
      'once per refresh, and nothing flickers.',
    formula: 'map at {0x403000}: 64,000 bytes, one per pixel',
    time: '≈ 24 s',
    state: {
      tab: 'memory',
      graphics: screen(186, 70, counter(2210846)),
      marks: null,
      code: { focus: ['map', 'sub', 'refresh'], current: null },
      writes: { map: mapAt(186, 70) },
      memory: { focus: { id: 'os_map', note: 'Row 72 of the map: 00 background, 01 window, 02 mouse', bytes: [MAP + 72 * 320 + 176, MAP + 72 * 320 + 191] } },
    },
  },
  {
    id: 'B5',
    phase: 'B',
    title: 'What day 11 did',
    summary: 'A window sits between the background and the mouse, a counter updates it as ' +
      'fast as the CPU can, and nothing flickers.',
    detail: 'Redraws start and stop at the right heights and write each pixel once, guided by ' +
      'the map. The counter also shows a problem: the CPU can count, but it has no sense of ' +
      'time. Day 12 adds a timer, so the OS can measure seconds and do things on schedule.',
    hint: 'Next, day 12: the timer.',
    milestone: { label: 'Window', text: 'The first window' },
    time: '≈ 24 s',
    state: {
      visual: 'table',
      table: LAYER_TABLE([186, 70], null),
      memory: { focus: { id: 'os_winbuf', note: 'The window layer' } },
    },
  },
]);

export const DAY_11 = Object.freeze({
  id: 'day11',
  title: 'Day 11',
  name: 'Windows',
  phases: PHASES,
  steps: STEPS,
});
