// Day 8: the mouse's bytes are grouped into packets and decoded, the cursor follows the
// mouse, and a closer look at the switch to protected mode from day 3.
// The programs are simplified teaching code (see js/data/programs/day08.js).

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { screen320 } from '../screens.js';
import { DAY_05, cursorAt } from './day05.js';
import { DAY_07 } from './day07.js';

const PHASES = Object.freeze({
  A: 'Decode the mouse',
  B: 'Move the cursor',
  C: 'Protected mode, a closer look',
});

const DAY_7_END = finalState(DAY_07.steps);

const reg = (value, note) => ({ value, note });
const hex2 = (value) => value.toString(16).toUpperCase().padStart(2, '0');
const IN_MAIN = reg('0000C3··', 'In kernel_main');
const PIC_OPEN = { imr: [0xF9, 0xEF], base: [0x20, 0x28], active: null, note: null };

// Day 5's screen without its cursor, so the cursor can be drawn anywhere
const DAY5_OPS = finalState(DAY_05.steps).graphics.ops;
const BACKGROUND = DAY5_OPS.filter((op) => op.op !== 'bitmap');
const START = { x: 152, y: 78 };

const pad = (n, width) => String(n).padStart(width);
const packetText = (btn, x, y) =>
  `[${btn & 1 ? 'L' : 'l'}${btn & 4 ? 'C' : 'c'}${btn & 2 ? 'R' : 'r'} ${pad(x, 4)} ${pad(y, 4)}]`;
const coordsText = (x, y) => `(${pad(x, 3)}, ${pad(y, 3)})`;
const line = (y, text) => [
  { op: 'box', color: C.black, x0: 8, y0: y, x1: 8 + text.length * 8 - 1, y1: y + 15 },
  { op: 'text', x: 8, y, color: C.white, text },
];

// The screen after a packet: decoded values at (8, 96), position at (8, 112), cursor.
// `holes` are spots where the cursor was erased with plain teal.
function screenAfter({ btn = 0, dx = 0, dy = 0, x, y, holes = [] }) {
  return screen320([
    ...BACKGROUND,
    ...holes.map(([hx, hy]) => ({ op: 'box', color: C.teal, x0: hx, y0: hy, x1: hx + 15, y1: hy + 15 })),
    ...line(96, packetText(btn, dx, dy)),
    ...line(112, coordsText(x, y)),
    cursorAt(x, y),
  ]);
}

const PACKET_TABLE = (bytes, focus) => ({
  title: `Packet ${bytes.map(hex2).join(' ')}`,
  head: ['Byte', 'Bits', 'Meaning'],
  rows: [
    { cells: ['0', bytes[0].toString(2).padStart(8, '0'), 'bit 0 left · 1 right · 2 middle · 3 always 1'], focus: focus.includes('buttons') },
    { cells: ['', '', 'bit 4: x is negative · bit 5: y is negative'], focus: focus.includes('signs') },
    { cells: ['1', bytes[1].toString(2).padStart(8, '0'), 'x movement, low 8 bits'], focus: focus.includes('x') },
    { cells: ['2', bytes[2].toString(2).padStart(8, '0'), 'y movement, low 8 bits'], focus: focus.includes('y') },
  ],
  note: 'A movement only fits in 9 bits: 8 in its own byte plus a sign bit in byte 0.',
});

const LAYOUT_TABLE = {
  title: 'Where things are in memory now',
  head: ['Address', 'What', 'Since'],
  rows: [
    { cells: ['0x00000–0x004FF', 'BIOS tables (IVT, BDA): unused now', 'day 0'], dim: true },
    { cells: ['0x00FF0–0x00FFB', 'Boot info for the C code', 'day 3'] },
    { cells: ['0x07C00–0x07DFF', 'IPL, the boot sector', 'day 3'], dim: true },
    { cells: ['0x08000–0x34FFF', 'Disk image: 10 cylinders', 'day 3'] },
    { cells: ['0x0C200–', 'Kernel: kernel.asm, then the C code', 'day 3'], focus: true },
    { cells: ['… 0x8FFFF', 'Stack, growing down from 0x90000', 'day 3'] },
    { cells: ['0xA0000–0xAF9FF', 'Video memory, 320 × 200', 'day 3'] },
    { cells: ['0x26F800–0x26FFFF', 'IDT', 'day 5'], focus: true },
    { cells: ['0x270000–0x27FFFF', 'GDT', 'day 5'], focus: true },
  ],
  note: 'Everything from 0x100000 up, except the two tables, is still unused: day 9 counts it.',
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 7 stopped',
    summary: 'The mouse is on and its bytes reach the main loop, but they are only printed. ' +
      'The cursor doesn\'t move.',
    detail: 'The bytes come in groups of three, one group (a packet) per movement or button ' +
      'change. Today the kernel puts each group together, works out what it says, and ' +
      'moves the cursor by that much.',
    time: '≈ 13 s',
    state: {
      ...DAY_7_END,
      regs: { ...DAY_7_END.regs, 'EIP': IN_MAIN },
      tab: 'code',
      visual: 'fifo',
      pic: PIC_OPEN,
      table: null,
      terminal: null,
      code: { program: 'day7Mouse', focus: ['showmouse'], current: 'loop', trace: true },
      memory: { ...DAY_7_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Group the bytes in threes',
    summary: 'mouse_decode collects bytes one at a time and reports a packet when it has ' +
      'three. It first skips the FA that answered enable_mouse.',
    detail: 'If a byte were ever lost, the groups would shift and every packet after it would ' +
      'be read wrong. So the first byte of a packet is checked: bit 3 is always 1, and bits ' +
      '6 and 7, which mean "moved too fast to count", should be 0. A byte that fails isn\'t ' +
      'taken as a first byte, and the decoder falls back in step.',
    formula: 'first byte: (byte & 0xC8) == 0x08',
    time: '≈ 13 s',
    state: {
      code: { program: 'day8Decode', focus: ['struct', 'ack', 'first', 'check', 'second', 'third'], current: 'decode' },
      fifo: {
        title: 'mousefifo: 128 bytes for the mouse', size: 128,
        slots: [0xFA, 0x28, 0x02, 0xFE, ...new Array(124).fill(null)],
        write: 4, read: 4, note: 'All four read: FA skipped, then one packet of three.',
      },
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'What a packet says',
    summary: 'Byte 0 holds the buttons and two sign bits; bytes 1 and 2 hold how far the mouse ' +
      'moved left-right and up-down.',
    detail: '28 02 FE: no buttons; x is 02; bit 5 says y is negative, so FE means −2. ' +
      'Setting all the upper bits (| 0xFFFFFF00) turns the 8-bit value into the right ' +
      'negative int. The mouse counts up as positive and the screen counts down, so y is ' +
      'flipped: the mouse moved 2 to the right and 2 toward the user.',
    formula: '28 = 0010 1000 → y negative · x = 02 = +2 · y = FE = −2 → screen +2',
    time: '≈ 13 s',
    state: {
      code: { focus: ['decode', 'sign', 'flip'], current: 'third' },
      visual: 'table',
      table: PACKET_TABLE([0x28, 0x02, 0xFE], ['buttons', 'signs', 'x', 'y']),
      regs: { 'EAX': reg('00000002', 'mdec.x = 2'), 'ECX': reg('00000002', 'mdec.y = 2 after the flip') },
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'Show it',
    summary: 'The main loop prints each packet as buttons and movement: lcr for left, center, ' +
      'right, in capitals while held, then x and y.',
    detail: 'Pressing the left button sends 09 00 00: bit 0 set, no movement. With this ' +
      'display it\'s easy to check by hand that the decoding is right before trusting it to ' +
      'move the cursor.',
    formula: '28 02 FE → [lcr    2    2]\n09 00 00 → [Lcr    0    0]',
    time: '≈ 13.5 s',
    state: {
      tab: 'memory',
      code: { program: 'day8Move', focus: ['show'], current: 'erase' },
      table: PACKET_TABLE([0x09, 0x00, 0x00], ['buttons']),
      graphics: screenAfter({ btn: 1, dx: 0, dy: 0, ...START }),
      memory: { focus: { id: 'vram', note: 'The decoded packet at (8, 96)', bytes: [0xA0000 + 96 * 320 + 8, 0xA0000 + 96 * 320 + 23] } },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'Erase, move, draw',
    summary: 'To move the cursor, the kernel paints over it with the background color, adds the ' +
      'movement to its position, and draws it again.',
    detail: 'The position is kept inside the screen: never below 0, and never so far right ' +
      'or down that the 16 × 16 picture would stick out. The new position is printed under ' +
      'the packet. Many small packets later, the cursor has traveled to (200, 120).',
    formula: 'mx = 152 + 2 = 154, my = 78 + 2 = 80, … → (200, 120)\n0 ≤ mx ≤ 320 − 16 · 0 ≤ my ≤ 200 − 16',
    time: '≈ 15 s',
    state: {
      tab: 'code',
      visual: 'none',
      table: null,
      code: { focus: ['pos', 'erase', 'move', 'clamp', 'draw', 'coords'], current: 'loop' },
      graphics: screenAfter({ dx: 3, dy: 1, x: 200, y: 120 }),
      regs: { 'EAX': reg('000000C8', 'mx = 200'), 'ECX': reg('00000078', 'my = 120') },
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Erasing leaves holes',
    summary: 'Moving the cursor across the text wipes part of it out: erasing paints plain ' +
      'teal, whatever was there before.',
    detail: 'The kernel doesn\'t remember what was under the cursor, so it can\'t put it back. ' +
      'The same goes for the taskbar: erasing there paints teal on gray, and the cursor\'s ' +
      'corners are teal too. A proper fix keeps the background and the cursor in separate ' +
      'layers and redraws from them, which is days 10 and 11.',
    time: '≈ 18 s',
    state: {
      tab: 'memory',
      code: { focus: ['erase'], current: 'move' },
      graphics: screenAfter({ dx: -2, dy: 4, x: 60, y: 140, holes: [[24, 26], [40, 28]] }),
      regs: { 'EAX': reg('0000003C', 'mx = 60'), 'ECX': reg('0000008C', 'my = 140') },
      memory: { focus: { id: 'vram', note: 'Where the cursor erased part of the text' } },
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'Why the far jump',
    summary: 'On day 3, right after setting PE, the kernel made a far jump. The CPU had ' +
      'already read the next instructions as 16-bit code.',
    detail: 'To run fast, the CPU fetches and decodes instructions ahead of the one it is ' +
      'executing. When mov cr0, eax switched on protected mode, the following bytes were ' +
      'already decoded the real-mode way, and CS still held a real-mode value. A far jump ' +
      'throws away everything fetched ahead, loads CS from GDT entry 1, and starts decoding ' +
      'fresh, as 32-bit code.',
    time: '≈ 18 s',
    state: {
      tab: 'code',
      code: { program: 'kernelHead', focus: ['cr0', 'farjmp'], current: 'segs' },
      visual: 'gdt',
      gdt: { focus: 'code' },
      memory: { focus: null },
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'The memory map so far',
    summary: 'Everything the OS uses has a fixed place: the loaded disk and kernel low, video ' +
      'memory at 0xA0000, the GDT and IDT above 1 MiB.',
    detail: 'The BIOS\'s tables at the bottom are no longer needed now that the BIOS can\'t be ' +
      'called. The disk image stays where the IPL put it, so files on the floppy can be ' +
      'read straight from memory later. From day 9 the OS needs to hand out memory, and ' +
      'first it has to know how much there is.',
    time: '≈ 18 s',
    state: {
      tab: 'memory',
      visual: 'table',
      gdt: { focus: null },
      table: LAYOUT_TABLE,
      code: { program: 'day8Move', focus: null, current: 'loop' },
      memory: { focus: null },
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'What day 8 did',
    summary: 'The mouse moves the cursor: packets are put together, checked, decoded, and ' +
      'added to the cursor\'s position.',
    detail: 'Input works end to end now, from the hardware through interrupts and FIFOs to ' +
      'something moving on screen. What doesn\'t work is drawing: the cursor leaves holes ' +
      'because nothing remembers what was underneath. Before the OS can keep layers of ' +
      'windows in memory, it needs to manage memory, which starts on day 9.',
    hint: 'Next, day 9: counting memory and handing it out.',
    milestone: { label: 'Mouse', text: 'The cursor follows the mouse' },
    time: '≈ 18 s',
    state: {
      visual: 'none',
      table: null,
      memory: { focus: { id: 'vram', note: 'The screen at the end of day 8' } },
    },
  },
]);

export const DAY_08 = Object.freeze({
  id: 'day8',
  title: 'Day 8',
  name: 'Moving the cursor',
  phases: PHASES,
  steps: STEPS,
});
