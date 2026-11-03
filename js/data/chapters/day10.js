// Day 10: memory is handed out in 4 KiB pieces, and the screen is built from layers
// (sheets), each with its own buffer, so moving the mouse no longer damages what is
// under it. Redrawing is then limited to the rectangles that changed.
// The programs are simplified teaching code (see js/data/programs/day10.js).
//
// From day 10, a step can set `marks`, rectangles outlined on the graphics screen (for
// example the area a step redraws): [{ x0, y0, x1, y1 }].

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { screen320 } from '../screens.js';
import { DAY_05, cursorAt } from './day05.js';
import { DAY_09 } from './day09.js';

const PHASES = Object.freeze({
  A: 'Memory in 4 KiB pieces',
  B: 'Layers',
  C: 'Redraw only what changed',
});

const DAY_9_END = finalState(DAY_09.steps);

const reg = (value, note) => ({ value, note });
const hex = (value, width = 8) => '0x' + value.toString(16).toUpperCase().padStart(width, '0');
const IN_MAIN = reg('0000C3··', 'In kernel_main');

const MIB = 0x100000;
const MEMTOTAL = 32 * MIB;

// What the background buffer holds: day 5's picture without the cursor, plus the lines
// printed on days 8 and 9
const DAY5_OPS = finalState(DAY_05.steps).graphics.ops;
const pad = (n, width) => String(n).padStart(width);
const line = (y, text) => [
  { op: 'box', color: C.black, x0: 8, y0: y, x1: 8 + text.length * 8 - 1, y1: y + 15 },
  { op: 'text', x: 8, y, color: C.white, text },
];
export const background = (mx, my) => [
  ...DAY5_OPS.filter((op) => op.op !== 'bitmap'),
  ...line(96, '[lcr    0    0]'),
  ...line(112, `(${pad(mx, 3)}, ${pad(my, 3)})`),
  ...line(144, 'memory 32MB  free 28672KB'),
];
const screenAt = (mx, my) => screen320([...background(mx, my), cursorAt(mx, my)]);

// Blocks handed out today, from the start of free memory
const CTL_ADDR = 0x400000;          // struct SHTCTL, 9,232 bytes → 12 KiB
const BACK_ADDR = 0x403000;         // background buffer, 64,000 bytes → 64 KiB
const BACK_END = BACK_ADDR + 0x10000;
// The background layer's buffer in memory, holding the same picture as the screen
const backBuffer = (mx, my) => ({ start: BACK_ADDR, end: BACK_ADDR + 64000 - 1, graphics: screen320(background(mx, my)) });
const SHEET_LAYOUT = [
  ...DAY_9_END.memory.layout,
  { id: 'os_shtctl', start: CTL_ADDR, end: BACK_ADDR - 1, name: 'Layer control block (SHTCTL)', kind: 'ram' },
  { id: 'os_backbuf', start: BACK_ADDR, end: BACK_END - 1, name: 'Background layer\'s pixels', kind: 'ram' },
];

const sheetTable = (mouse, focus) => ({
  title: 'Layers, top to bottom',
  head: ['Height', 'Layer', 'Size', 'At', 'Pixels at', 'See-through'],
  rows: [
    { cells: ['1', 'Mouse', '16 × 16', `(${mouse[0]}, ${mouse[1]})`, 'buf_mouse (in the kernel)', 'color 99'], focus: focus === 'mouse' },
    { cells: ['0', 'Background', '320 × 200', '(0, 0)', hex(BACK_ADDR), 'none'], focus: focus === 'back' },
  ],
  note: 'The screen is rebuilt by copying each layer in order, from height 0 up.',
});

const START = [152, 78];

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 9 stopped',
    summary: 'The OS can hand out memory, and the cursor still damages the screen when it ' +
      'moves.',
    detail: 'The kernel draws everything straight into video memory, so it can\'t tell what ' +
      'was under the cursor once it moves away. Today each part of the screen gets its own ' +
      'buffer, from the memory manager, and the screen is put together from them.',
    time: '≈ 18 s',
    state: {
      ...DAY_9_END,
      regs: { ...DAY_9_END.regs, 'EIP': IN_MAIN, 'EAX': reg('????????', 'Used by earlier code') },
      tab: 'code',
      visual: 'none',
      table: null,
      fifo: null,
      marks: null,
      terminal: null,
      ranges: {},
      code: { program: 'day8Move', focus: ['erase'], current: 'loop', trace: true },
      memory: { ...DAY_9_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Round up to 4 KiB',
    summary: 'memman_alloc_4k rounds every request up to a multiple of 4 KiB before asking the ' +
      'memory manager.',
    detail: 'Odd sizes leave odd-sized gaps when they are freed, and the free list fills up ' +
      'with fragments too small to use. Rounding keeps every range a whole number of 4 KiB ' +
      'pages. Adding 0xFFF and clearing the low 12 bits rounds up in one step.',
    formula: '(64,000 + 0xFFF) & 0xFFFFF000 = 0xFA00 → 0x10000 (64 KiB)\n' +
      '(9,232 + 0xFFF) & 0xFFFFF000 = 0x2410 → 0x3000 (12 KiB)',
    time: '≈ 18 s',
    state: {
      code: { program: 'day10Alloc4k', focus: ['alloc', 'round', 'free'], current: null },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'One buffer per layer',
    summary: 'The background is drawn into a buffer of its own, and so is the mouse. The ' +
      'screen is made by copying the buffers into video memory, lowest layer first.',
    detail: 'A layer, called a sheet, has a buffer, a size, a position on screen, and a ' +
      'height in the stack. The control block keeps every sheet and a list of the visible ' +
      'ones in order. The kernel allocates the control block (12 KiB at {0x400000}) and the ' +
      'background buffer (64 KiB at {0x403000}); the mouse\'s 256 bytes are a plain array ' +
      'in the kernel.',
    time: '≈ 18 s',
    state: {
      tab: 'memory',
      code: { program: 'day10Main', focus: ['decl', 'init', 'buffers', 'draw', 'place', 'order'], current: 'mousebuf' },
      visual: 'table',
      table: sheetTable(START, 'back'),
      memory: { layout: SHEET_LAYOUT, focus: { id: 'os_backbuf', note: 'The background layer: the desktop and text' } },
      ranges: { ctl: { start: CTL_ADDR, end: BACK_ADDR - 1, state: 'written' } },
      writes: { backBuf: backBuffer(...START) },
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'See-through pixels',
    summary: 'The cursor\'s corners are drawn in color 99, a number the OS never uses as a ' +
      'color. When layers are copied, pixels of that color are skipped.',
    detail: 'Before, the corners were teal to match the desktop, which looked wrong anywhere ' +
      'else. Now whatever is underneath shows through. Each sheet names its own see-through ' +
      'color, col_inv; the background has none (−1).',
    formula: 'make_cursor(buf_mouse, 99): * → 0 (black), O → 7 (white), . → 99 (skip)',
    time: '≈ 18 s',
    state: {
      tab: 'code',
      code: { program: 'day10Sheet', focus: ['struct', 'inv'], current: 'ctl' },
      table: sheetTable(START, 'mouse'),
      memory: { focus: null },
    },
  },
  {
    id: 'B3',
    phase: 'B',
    title: 'Rebuild the screen',
    summary: 'Copying every layer, bottom to top, puts the screen together: the background, ' +
      'then the cursor on top.',
    detail: 'Done for the whole screen, that is 64,000 pixels for the background and 256 ' +
      'for the cursor every time anything changes. It works, but redrawing the whole ' +
      'background because the mouse moved a few pixels is a lot of wasted copying.',
    formula: 'whole screen: 320 × 200 + 16 × 16 = 64,256 pixels copied per change',
    time: '≈ 18 s',
    state: {
      graphics: screenAt(...START),
      marks: [{ x0: 0, y0: 0, x1: 319, y1: 199 }],
      code: { focus: ['ctl', 'refresh'], current: null },
      table: sheetTable(START, null),
    },
  },
  {
    id: 'B4',
    phase: 'B',
    title: 'Move without damage',
    summary: 'Moving the cursor is just changing the mouse layer\'s position and rebuilding. ' +
      'The text it passes over comes back untouched.',
    detail: 'Nothing is erased any more: the background buffer still holds the full desktop ' +
      'and text, so whatever the cursor uncovers is copied from there. The cursor can sit on ' +
      'the text or the taskbar and shows the right thing around its shape.',
    time: '≈ 20 s',
    state: {
      graphics: screenAt(36, 30),
      marks: null,
      code: { program: 'day10Main', focus: ['move'], current: 'text' },
      table: sheetTable([36, 30], 'mouse'),
      regs: { 'EAX': reg('00000024', 'mx = 36'), 'ECX': reg('0000001E', 'my = 30') },
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'Redraw a rectangle',
    summary: 'sheet_refreshsub redraws only a rectangle of the screen, taking from each layer ' +
      'just the part inside it.',
    detail: 'When the cursor moves from (36, 30) to (40, 34), only two 16 × 16 areas change: ' +
      'where it was, which must show the background again, and where it is now. ' +
      'sheet_slide redraws exactly those two. Every layer is clipped to the rectangle, so ' +
      'the loops cover a few hundred pixels instead of 64,000.',
    formula: '2 areas × 16 × 16 × 2 layers = 1,024 pixels at most, instead of 64,256',
    time: '≈ 20 s',
    state: {
      graphics: screen320([...background(36, 30), cursorAt(40, 34)]),  // the position text is updated next
      marks: [{ x0: 36, y0: 30, x1: 51, y1: 45 }, { x0: 40, y0: 34, x1: 55, y1: 49 }],
      code: { program: 'day10Sheet', focus: ['clip', 'slide', 'slideold', 'slidenew'], current: null },
      table: sheetTable([40, 34], 'mouse'),
      regs: { 'EAX': reg('00000028', 'mx = 40'), 'ECX': reg('00000022', 'my = 34') },
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'Changing a layer\'s contents',
    summary: 'When the kernel writes new text into the background buffer, it redraws just ' +
      'that text\'s rectangle.',
    detail: 'The position line is drawn into buf_back, which changes nothing on screen by ' +
      'itself. sheet_refresh takes a rectangle in the layer\'s own coordinates, adds the ' +
      'layer\'s position, and redraws that part of the screen, cursor included if it ' +
      'happens to be there.',
    formula: 'sheet_refresh(shtctl, sht_back, 8, 112, 88, 128): 80 × 16 pixels',
    time: '≈ 20 s',
    state: {
      tab: 'memory',
      graphics: screenAt(40, 34),
      marks: [{ x0: 8, y0: 112, x1: 87, y1: 127 }],
      code: { program: 'day10Main', focus: ['text'], current: 'move' },
      memory: { focus: { id: 'os_backbuf', note: 'Row 112 of the background buffer: the position text', bytes: [BACK_ADDR + 112 * 320 + 8, BACK_ADDR + 112 * 320 + 23] } },
      writes: { backBuf: backBuffer(40, 34) },
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'What day 10 did',
    summary: 'The screen is built from layers, each in its own buffer, and only rectangles ' +
      'that changed are redrawn.',
    detail: 'Memory now comes in 4 KiB pieces, the background and the cursor are separate ' +
      'sheets, color 99 makes pixels see-through, and moving or changing a layer redraws ' +
      'only the area affected. Day 11 adds a window as a third layer and makes redrawing ' +
      'faster still, so nothing flickers.',
    hint: 'Next, day 11: windows.',
    milestone: { label: 'Layers', text: 'The screen is made of layers' },
    time: '≈ 20 s',
    state: {
      marks: null,
      visual: 'table',
      table: sheetTable([40, 34], null),
      memory: { focus: { id: 'os_backbuf', note: 'The background layer' } },
    },
  },
]);

export const DAY_10 = Object.freeze({
  id: 'day10',
  title: 'Day 10',
  name: 'Layers',
  phases: PHASES,
  steps: STEPS,
});
