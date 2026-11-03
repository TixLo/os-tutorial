// Day 14: before leaving real mode, kernel.asm asks the video card's VBE BIOS for a
// 640 × 480 mode with a linear frame buffer; then the keyboard types characters into a
// text box with a blinking cursor, and the window can be dragged with the mouse.
// The programs are simplified teaching code (see js/data/programs/day14.js).

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { desktop, windowOps, textboxOps, box } from '../screens.js';
import { DAY_05, cursorAt } from './day05.js';
import { DAY_13 } from './day13.js';

const PHASES = Object.freeze({
  A: 'High resolution',
  B: 'Typing',
  C: 'Drag the window',
});

const DAY_13_END = finalState(DAY_13.steps);

const reg = (value, note) => ({ value, note });
const hex = (value, width = 8) => '0x' + value.toString(16).toUpperCase().padStart(width, '0');
const IN_MAIN = reg('0000C3··', 'In kernel_main');

const W = 640;
const H = 480;
const VRAM = 0xE0000000;
const FRAME_BYTES = W * H;

// Today's kernel allocates its layers for 640 × 480: control block, map, background,
// window, each rounded up to 4 KiB
const round4k = (n) => (n + 0xFFF) & ~0xFFF;
const CTL = 0x400000;
const MAP = CTL + 0x3000;
const BACK = MAP + round4k(FRAME_BYTES);
const WIN = BACK + round4k(FRAME_BYTES);
const LAYOUT = [
  ...DAY_13_END.memory.layout.filter((region) => !['os_shtctl', 'os_map', 'os_backbuf', 'os_winbuf'].includes(region.id)),
  { id: 'os_shtctl', start: CTL, end: MAP - 1, name: 'Layer control block (SHTCTL)', kind: 'ram' },
  { id: 'os_map', start: MAP, end: BACK - 1, name: 'Layer map, 640 × 480', kind: 'ram' },
  { id: 'os_backbuf', start: BACK, end: WIN - 1, name: 'Background layer\'s pixels, 640 × 480', kind: 'ram' },
  { id: 'os_winbuf', start: WIN, end: WIN + 0x3000 - 1, name: 'Window layer\'s pixels (160 × 52)', kind: 'ram' },
  { id: 'vbe_vram', start: VRAM, end: VRAM + round4k(FRAME_BYTES) - 1, name: 'Video memory: VBE linear frame buffer', kind: 'vram' },
];

// The 640 × 480 screen: the same desktop and text as before, drawn bigger, and a window
// with a text box
const DAY5_TEXT = finalState(DAY_05.steps).graphics.ops.filter((op) => op.op === 'text');
const line = (y, text) => [
  box(C.black, 8, y, 8 + text.length * 8 - 1, y + 15),
  { op: 'text', x: 8, y, color: C.white, text },
];
const BACKGROUND = [
  ...desktop(W, H),
  ...DAY5_TEXT.map((op) => (op.text.startsWith('scrnx') ? { ...op, text: `scrnx = ${W}` } : op)),
  ...line(144, 'memory 32MB  free 28048KB'),
];
function screen({ win = [200, 120], text = '', cursor = true, mouse = [300, 220] } = {}) {
  const [wx, wy] = win;
  const ops = [
    ...BACKGROUND,
    ...windowOps(wx, wy, 160, 52, 'window'),
    ...textboxOps(wx + 8, wy + 28, 144, 16),
    { op: 'text', x: wx + 8, y: wy + 28, color: C.black, text },
  ];
  if (cursor) {
    const cx = wx + 8 + text.length * 8;
    ops.push(box(C.black, cx, wy + 28, cx + 7, wy + 43));
  }
  return { width: W, height: H, base: VRAM, ops: [...ops, cursorAt(...mouse)] };
}

const BOOT_INFO = (scrnx, scrny, vram) => ({
  start: 0x00FF0, end: 0x00FFB,
  data: [[0x00FF0, [0x0A, 0x00, 0x08, 0x00, scrnx & 0xFF, scrnx >> 8, scrny & 0xFF, scrny >> 8,
    vram & 0xFF, (vram >>> 8) & 0xFF, (vram >>> 16) & 0xFF, vram >>> 24]]],
});

const VBE_LOG = [
  '> trace int 0x10',
  'AX=4F00 ES:DI=9000:0000  -> AX=004F  "VESA" version 3.0',
  'AX=4F01 CX=0101          -> AX=004F  mode info at 0x90000',
  '   attributes 00BB: bit 7 set, linear frame buffer available',
  '   640 x 480, 8 bits per pixel, memory model 4 (packed pixel)',
  `   frame buffer at ${hex(VRAM)}`,
  'AX=4F02 BX=4101          -> AX=004F  mode set',
];

const MODE_TABLE = {
  title: 'Mode 0x101, as the VBE BIOS describes it',
  head: ['Offset', 'Field', 'Value'],
  rows: [
    { cells: ['0x00', 'Attributes', '0x00BB (bit 7: linear frame buffer)'], focus: true },
    { cells: ['0x12', 'Width', '640'] },
    { cells: ['0x14', 'Height', '480'] },
    { cells: ['0x19', 'Bits per pixel', '8'], focus: true },
    { cells: ['0x1B', 'Memory model', '4: packed pixel'], focus: true },
    { cells: ['0x28', 'Frame buffer address', hex(VRAM)] },
  ],
  note: 'The book\'s kernel can also ask for 1024 × 768 (mode 0x105); this site uses 640 × 480 to stay legible.',
};

const KEY_TABLE = {
  title: 'keytable: key code → character',
  head: ['Code', 'Key', 'keytable[code]'],
  rows: [
    { cells: ['0x02', '1', '\'1\''] },
    { cells: ['0x0E', 'Backspace', '0 (handled separately)'], dim: true },
    { cells: ['0x1C', 'Enter', '0 (not yet)'], dim: true },
    { cells: ['0x1E', 'A', '\'A\''], focus: true },
    { cells: ['0x23', 'H', '\'H\''] },
    { cells: ['0x2A', 'Left Shift', '0 (day 16 of the book adds it)'], dim: true },
    { cells: ['0x39', 'Space', '\' \''] },
    { cells: ['0x9E', 'A released', 'ignored: ≥ 0x54'], dim: true },
  ],
  note: 'Only presses below 0x54 are looked up; releases have bit 7 set and are skipped.',
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 13 stopped',
    summary: 'Events and timers are efficient now. The screen is still 320 × 200, which is ' +
      'very little room for windows.',
    detail: 'Mode 13h is the only 256-color mode every VGA card has. Newer cards offer more ' +
      'through the VESA BIOS Extensions (VBE), a standard set of video BIOS functions. Like ' +
      'all BIOS calls, they must be made in real mode, so the change goes into kernel.asm, ' +
      'before the switch to protected mode.',
    time: '≈ 79 s',
    state: {
      ...DAY_13_END,
      regs: { ...DAY_13_END.regs, 'EIP': IN_MAIN },
      tab: 'code',
      visual: 'none',
      table: null,
      fifo: null,
      marks: null,
      terminal: null,
      code: { program: 'kernelHead', focus: ['setmode'], current: 'setmode', trace: true },
      memory: { ...DAY_13_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Is VBE there?',
    summary: 'INT 10h with AX = 4F00 asks the video BIOS whether it supports VBE. It answers ' +
      'AX = 004F and fills in a block starting with "VESA" and its version.',
    detail: 'Any answer other than 004F, or a version below 2.0, means no usable VBE, and the ' +
      'kernel falls back to mode 13h exactly as before. Being careful matters: setting a ' +
      'mode the card doesn\'t have would leave the screen blank with no way to report why.',
    time: '≈ 2.6 s (real mode, at boot)',
    state: {
      cpu: 'running',
      tab: 'terminal',
      code: { program: 'day14Vbe', focus: ['mode', 'check'], current: 'info' },
      regs: {
        'CS': reg('0000', 'Real mode again: this runs at boot'),
        'EIP': reg('0000C2··', 'In kernel.asm, before protected mode'),
        'EAX': reg('0000004F', 'AX = 004F: VBE is supported'),
        'CR0': reg('00000010', 'PE = 0: real mode'),
      },
      terminal: { lines: VBE_LOG.slice(0, 2) },
      csip: '0000:C2··',
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Describe mode 0x101',
    summary: 'Function 4F01 returns a description of mode 0x101: 640 × 480, 8 bits per ' +
      'pixel, and the address of its frame buffer.',
    detail: 'The kernel checks three things before using the mode: one byte per pixel, the ' +
      'packed-pixel memory model (each byte one pixel, like mode 13h), and a linear frame ' +
      'buffer, so all 307,200 bytes of the screen appear as one block of memory. That block ' +
      'is far above RAM, at {0xE0000000}.',
    formula: '640 × 480 = 307,200 bytes, too big for the 64 KiB window at 0xA0000',
    time: '≈ 2.6 s (real mode, at boot)',
    state: {
      code: { focus: ['info'], current: 'set' },
      visual: 'table',
      table: MODE_TABLE,
      terminal: { lines: VBE_LOG.slice(0, 6) },
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: '640 × 480',
    summary: 'Function 4F02 sets the mode, and the boot info gets the new width, height, and ' +
      'video memory address. The C code needs no other change.',
    detail: 'Since day 5 every drawing function has taken the screen size and address from ' +
      'the boot info, so the desktop, the layers, and the map simply come out bigger. Only ' +
      'the buffers grow: the background and the map need 300 KiB each now.',
    formula: 'boot info: scrnx 0x0280 = 640, scrny 0x01E0 = 480, vram 0xE0000000',
    time: '≈ 80 s',
    state: {
      cpu: 'protected',
      tab: 'memory',
      graphics: screen(),
      regs: {
        'CS': reg('0008', 'Code segment, GDT entry 1'),
        'EIP': IN_MAIN,
        'EAX': reg('????????', 'Used by earlier code'),
        'CR0': reg('00000011', 'PE = 1: protected mode'),
      },
      csip: '0008:0000C3··',
      code: { focus: ['set', 'bootinfo'], current: null },
      terminal: { lines: VBE_LOG },
      writes: { bootInfo: BOOT_INFO(W, H, VRAM), backBuf: null, winBuf: null, map: null },
      memory: { layout: LAYOUT, focus: { id: 'free_low', note: 'The boot info, now 640 × 480 at 0xE0000000', bytes: [0x00FF0, 0x00FFB] } },
      ranges: { ctl: { start: CTL, end: MAP - 1, state: 'written' }, map: { start: MAP, end: WIN - 1, state: 'written' } },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'Key codes to characters',
    summary: 'A table indexed by key code gives the character printed on that key, or 0 for ' +
      'keys that don\'t type anything.',
    detail: 'Key codes follow the keyboard\'s layout, not the alphabet: 0x10 to 0x19 are the ' +
      'top letter row Q to P. So the conversion is just a lookup. Release codes (0x80 and up) ' +
      'and keys without a character are skipped. Letters come out as capitals for now; ' +
      'Shift and Caps Lock come later.',
    time: '≈ 80 s',
    state: {
      tab: 'code',
      code: { program: 'day14Keys', focus: ['table'], current: 'box' },
      table: KEY_TABLE,
      terminal: null,
      memory: { focus: null },
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Type into a text box',
    summary: 'The window gets a sunken white text box. Each key\'s character is drawn at ' +
      'cursor_x, which then moves 8 pixels right.',
    detail: 'Typing H, E, L, L, O puts "HELLO" in the box. putstr_on_sheet draws each ' +
      'character with a white background and refreshes just its 8 × 16 rectangle. The box ' +
      'stops taking characters when it is full.',
    time: '≈ 85 s',
    state: {
      tab: 'memory',
      graphics: screen({ text: 'HELLO' }),
      visual: 'none',
      code: { focus: ['box', 'key'], current: 'cursor' },
      regs: { 'EAX': reg('00000118', 'i = 256 + 0x18: the O key') },
      memory: { focus: { id: 'vbe_vram', note: 'Video memory now starts at 0xE0000000' } },
    },
  },
  {
    id: 'B3',
    phase: 'B',
    title: 'Backspace and a blinking cursor',
    summary: 'Backspace (code 0x0E) erases the last character. A block cursor after the text ' +
      'blinks every half second, driven by the timer from day 13.',
    detail: 'The blink timer sends 1 and 0 alternately; the main loop sets the cursor color to ' +
      'black or white and redraws the 8 × 16 block at cursor_x. After any key the cursor ' +
      'is redrawn at its new position right away, so it never lags behind the text.',
    time: '≈ 87 s',
    state: {
      graphics: screen({ text: 'HELL' }),
      code: { focus: ['backspace', 'cursor', 'blink'], current: null },
      marks: [{ x0: 240, y0: 148, x1: 247, y1: 163 }],
      regs: { 'EAX': reg('0000010E', 'i = 256 + 0x0E: Backspace') },
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'Drag the window',
    summary: 'While the left mouse button is held, the window layer follows the cursor, as if ' +
      'grabbed by its title bar.',
    detail: 'sheet_slide does all the work: it moves the layer, updates the map, and redraws ' +
      'the old and new areas, so the desktop reappears behind the window as it moves. For ' +
      'now the window jumps to wherever the button is held, even if the click was not on its ' +
      'title bar; later days check where the click was.',
    formula: 'window position = (mx − 80, my − 8)',
    time: '≈ 90 s',
    state: {
      tab: 'code',
      graphics: screen({ text: 'HELL', win: [340, 252], mouse: [420, 260] }),
      marks: null,
      code: { program: 'day14Drag', focus: ['drag'], current: 'decode' },
      regs: { 'EAX': reg('000001A4', 'mx = 420'), 'ECX': reg('00000104', 'my = 260') },
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'What day 14 did',
    summary: 'The screen is 640 × 480, keys type into a text box with a blinking cursor, and ' +
      'windows can be dragged.',
    detail: 'VBE gave a bigger mode with almost no change to the C code, thanks to the boot ' +
      'info. The keyboard now produces characters. Everything runs in one main loop, which ' +
      'is getting crowded; day 15 lets the CPU run more than one task at a time.',
    hint: 'Next, day 15: task switching.',
    milestone: { label: 'Typing', text: 'High resolution and typing' },
    time: '≈ 90 s',
    state: {
      tab: 'memory',
      memory: { focus: { id: 'vbe_vram', note: 'The 640 × 480 screen' } },
    },
  },
]);

export const DAY_14 = Object.freeze({
  id: 'day14',
  title: 'Day 14',
  name: 'High resolution, typing',
  phases: PHASES,
  steps: STEPS,
});

// Day 14's 640 × 480 screen, for the days that follow
export { screen as screen640, LAYOUT as LAYOUT640 };
