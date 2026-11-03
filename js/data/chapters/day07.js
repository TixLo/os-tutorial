// Day 7: the keyboard handler reads the key code and tells the PIC it is done, handlers
// hand their bytes to the main loop through ring buffers (FIFOs), and the mouse is
// switched on.
// The programs are simplified teaching code (see js/data/programs/day07.js).
//
// From day 7, a step can set `fifo` for the ring buffer diagram (visual: 'fifo'):
//   { title, size, slots: [byte | null], write, read, note }

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { screen320 } from '../screens.js';
import { DAY_05 } from './day05.js';
import { DAY_06 } from './day06.js';

const PHASES = Object.freeze({
  A: 'Read the key',
  B: 'Keep handlers short',
  C: 'The mouse',
});

const DAY_6_END = finalState(DAY_06.steps);
const DAY5_SCREEN = finalState(DAY_05.steps).graphics.ops;

const reg = (value, note) => ({ value, note });
const hex2 = (value) => value.toString(16).toUpperCase().padStart(2, '0');
const IN_MAIN = reg('0000C3··', 'In kernel_main');
const IN_HANDLER = reg('0000C8··', 'In inthandler21');
const PIC_OPEN = { imr: [0xF9, 0xEF], base: [0x20, 0x28], active: null, note: null };

// The bytes the main loop prints: key codes at (8, 96), mouse bytes at (40, 96)
const BYTE_Y = 96;
const byteAt = (x, value) => [
  { op: 'box', color: C.black, x0: x, y0: BYTE_Y, x1: x + 15, y1: BYTE_Y + 15 },
  { op: 'text', x, y: BYTE_Y, color: C.white, text: hex2(value) },
];
const screenWith = (key, mouse) => screen320([
  ...DAY5_SCREEN,
  ...(key === null ? [] : byteAt(8, key)),
  ...(mouse === null ? [] : byteAt(40, mouse)),
]);

// A FIFO's slots from a map of index -> byte
const slots = (size, filled) => Array.from({ length: size }, (_, i) => (i in filled ? filled[i] : null));
const keyFifo = (filled, write, read, note) => ({
  title: 'keyfifo: 32 bytes for the keyboard', size: 32, slots: slots(32, filled), write, read, note,
});
const mouseFifo = (filled, write, read, note) => ({
  title: 'mousefifo: 128 bytes for the mouse', size: 128, slots: slots(128, filled), write, read, note,
});

const KEY_TRACE = (code, meaning) => [
  '> trace interrupts',
  'IRQ 1 -> INT 0x21 -> asm_inthandler21 -> inthandler21',
  'out 0x20 <- 61    master: IRQ 1 is done',
  `in  0x60 -> ${hex2(code)}    ${meaning}`,
  'iretd: back to hlt in kernel_main',
];

const MOUSE_LOG = [
  '> watch ports 0x60 0x64',
  'in  0x64 -> 1C    status: bit 1 = 0, ready',
  'out 0x64 <- 60    command: write the mode',
  'in  0x64 -> 1C    ready',
  'out 0x60 <- 47    mode: keyboard and mouse interrupts on',
  'in  0x64 -> 1C    ready',
  'out 0x64 <- D4    command: next byte goes to the mouse',
  'in  0x64 -> 1C    ready',
  'out 0x60 <- F4    mouse: enable data reporting',
];

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 6 stopped',
    summary: 'A key press reaches inthandler21, which prints a message and then stops the ' +
      'whole machine forever.',
    detail: 'Two things are missing. The handler never reads the key, so the keyboard ' +
      'controller keeps waiting for someone to take it and sends nothing more. And it never ' +
      'tells the PIC the interrupt is finished, so the PIC won\'t pass on another IRQ 1. ' +
      'Today the handler does both, then returns.',
    time: '≈ 9 s',
    state: {
      ...DAY_6_END,
      regs: { ...DAY_6_END.regs, 'EIP': IN_HANDLER },
      tab: 'code',
      visual: 'pic',
      pic: PIC_OPEN,
      fifo: null,
      table: null,
      terminal: null,
      code: { program: 'day6Handler', focus: ['stop'], current: 'stop', trace: true },
      memory: { ...DAY_6_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Read the key code',
    summary: 'in from port 0x60 gives the key\'s code. Pressing A gives 1E.',
    detail: 'Keyboards send a number for each key, a scan code, not a letter: 1E is the A ' +
      'key wherever it sits and whatever it is labeled. Before reading it, the handler ' +
      'writes 0x61 to the master PIC: "end of interrupt" for IRQ 1 (0x60 + the IRQ ' +
      'number). Then it shows the code in hex and returns, and the CPU goes back to hlt.',
    formula: 'EOI for IRQ n on the master: out 0x20 ← 0x60 + n',
    time: '≈ 9 s',
    state: {
      tab: 'terminal',
      graphics: screenWith(0x1E, null),
      code: { program: 'day7Key', focus: ['ports', 'eoi', 'read', 'show'], current: 'func' },
      regs: { 'EIP': IN_HANDLER, 'EAX': reg('0000001E', 'AL = 1E: the A key, pressed'), 'EFLAGS': reg('00000002', 'IF = 0 inside the handler') },
      pic: { ...PIC_OPEN, active: 1 },
      terminal: { lines: KEY_TRACE(0x1E, 'A key pressed (make code)') },
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Release the key',
    summary: 'Letting go of A sends a second interrupt, with code 9E.',
    detail: 'The keyboard reports both pressing and releasing, so the OS can tell how long ' +
      'a key was held, for Shift for example. The release code is the press code with bit 7 ' +
      'set: 1E + 80 = 9E. Holding a key down repeats the press code.',
    formula: 'release code = press code + 0x80 → 1E + 80 = 9E',
    time: '≈ 9.2 s',
    state: {
      graphics: screenWith(0x9E, null),
      regs: { 'EAX': reg('0000009E', 'AL = 9E: the A key, released') },
      terminal: { lines: KEY_TRACE(0x9E, 'A key released (break code)') },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'Handlers must be quick',
    summary: 'While a handler runs, interrupts are off. Drawing on screen inside it keeps them ' +
      'off for a long time, and bytes from other devices can be lost.',
    detail: 'The mouse sends three bytes for every movement, close together, and the ' +
      'keyboard controller holds only one byte at a time. If a handler is busy drawing when ' +
      'the next byte comes, that byte is gone. So the handler should only take the byte and ' +
      'leave it somewhere; the main loop, with interrupts on, does the slow work.',
    time: '≈ 9.2 s',
    state: {
      tab: 'code',
      visual: 'none',
      code: { program: 'day7Buffer', focus: ['buf', 'handler', 'store'], current: 'loop' },
      regs: { 'EIP': IN_MAIN, 'ESP': reg('0008FFFC', 'Back in kernel_main\'s stack frame') },
      pic: PIC_OPEN,
      terminal: null,
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'A one-byte mailbox',
    summary: 'The handler leaves the byte in keybuf and sets a flag; the main loop picks it ' +
      'up and draws it.',
    detail: 'The main loop must look at the flag with interrupts off, or a key could arrive ' +
      'between the check and the hlt and the loop would sleep with a byte waiting. ' +
      'io_stihlt solves the last gap: after sti the CPU always runs one more instruction ' +
      'before taking an interrupt, so sti followed by hlt can\'t miss one.',
    time: '≈ 9.2 s',
    state: {
      code: { focus: ['loop', 'cli', 'check', 'stihlt', 'take'], current: 'stihlt' },
      regs: { 'EFLAGS': reg('00000202', 'IF = 1 while sleeping in hlt') },
    },
  },
  {
    id: 'B3',
    phase: 'B',
    title: 'A ring buffer',
    summary: 'One byte isn\'t enough: some keys send two or more codes at once. A FIFO keeps ' +
      'a queue of 32, written by the handler and read by the main loop.',
    detail: 'Shifting every byte down after each read would be slow. A ring buffer instead ' +
      'keeps two positions: w, where the handler puts the next byte, and r, where the main ' +
      'loop takes the next one. Both move forward and wrap back to 0 at the end. Here A ' +
      'and B were pressed and released quickly: four codes wait in the queue.',
    formula: 'A: 1E 9E   B: 30 B0',
    time: '≈ 9.4 s',
    state: {
      code: { program: 'day7Fifo', focus: ['struct', 'put', 'get', 'status'], current: null },
      visual: 'fifo',
      fifo: keyFifo({ 0: 0x1E, 1: 0x9E, 2: 0x30, 3: 0xB0 }, 4, 0, '4 bytes waiting.'),
    },
  },
  {
    id: 'B4',
    phase: 'B',
    title: 'Around the ring',
    summary: 'Later, w and r have both come almost to the end. An arrow key\'s codes fill ' +
      'slots 30, 31, 0, and 1: the write position wrapped around.',
    detail: 'Arrow keys belong to a later keyboard design and send E0 before their code: up ' +
      'is E0 48 when pressed and E0 C8 when released. The main loop has read everything up ' +
      'to slot 29, so r is at 30. If w ever caught up with r while the queue was full, ' +
      'fifo8_put would drop the byte and set the overflow flag.',
    formula: 'free = size − waiting = 32 − 4 = 28',
    time: '≈ 12 s',
    state: {
      code: { focus: ['wrap', 'full'], current: null },
      fifo: keyFifo({ 30: 0xE0, 31: 0x48, 0: 0xE0, 1: 0xC8 }, 2, 30, '4 bytes waiting, across the end.'),
      graphics: screenWith(0xB0, null),
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'Switch the mouse on',
    summary: 'The mouse is silent until the kernel asks the keyboard controller to turn on its ' +
      'mouse interrupt and tells the mouse to start sending.',
    detail: 'The first PCs had no mouse, so the mouse circuit starts out off. Every command ' +
      'goes through the keyboard controller, which is slow: before each byte, the kernel ' +
      'waits until bit 1 of the status port 0x64 is 0. Command 60 followed by 47 sets the ' +
      'controller\'s mode with the mouse interrupt on; D4 followed by F4 tells the mouse ' +
      'itself to start reporting.',
    time: '≈ 12 s',
    state: {
      tab: 'terminal',
      visual: 'pic',
      fifo: null,
      code: { program: 'day7Mouse', focus: ['consts', 'wait', 'kbc', 'enable'], current: 'loop' },
      regs: { 'EDX': reg('00000060', 'The last port written') },
      terminal: { lines: MOUSE_LOG },
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'The mouse answers',
    summary: 'The mouse replies FA, "acknowledged", through IRQ 12: the slave PIC, then the ' +
      'master\'s IRQ 2, then interrupt 0x2C.',
    detail: 'inthandler2c must end the interrupt on both chips: 0x64 to the slave for its ' +
      'input 4 (IRQ 12), then 0x62 to the master for input 2, where the slave is connected. ' +
      'Then it reads the byte from port 0x60, the same port as the keyboard, and puts it in ' +
      'its own FIFO of 128 bytes. The main loop shows mouse bytes at (40, 96).',
    formula: 'IRQ 12 → slave input 4 → master input 2 → INT 0x2C',
    time: '≈ 12 s',
    state: {
      graphics: screenWith(0xB0, 0xFA),
      code: { focus: ['handler', 'eoi', 'showmouse'], current: 'loop' },
      pic: { ...PIC_OPEN, active: 12 },
      regs: { 'EAX': reg('000000FA', 'AL = FA: the mouse acknowledges') },
      terminal: { lines: [
        '> trace interrupts',
        'IRQ 12 -> slave input 4 -> master input 2 -> INT 0x2C',
        'out 0xA0 <- 64    slave: IRQ 12 is done',
        'out 0x20 <- 62    master: IRQ 2 is done',
        'in  0x60 -> FA    mouse: command acknowledged',
        'mousefifo <- FA',
      ] },
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'Move the mouse',
    summary: 'Every movement sends three bytes, each with its own interrupt: 28 02 FE.',
    detail: 'The bytes pile up in the mouse FIFO and the main loop prints them one by one, ' +
      'faster than the eye can follow, so only the last shows. What they mean, buttons and ' +
      'how far the mouse moved, is day 8\'s job; for now the cursor stays put.',
    time: '≈ 13 s',
    state: {
      tab: 'memory',
      visual: 'fifo',
      graphics: screenWith(0xB0, 0xFE),
      pic: { ...PIC_OPEN, active: 12 },
      fifo: mouseFifo({ 0: 0xFA, 1: 0x28, 2: 0x02, 3: 0xFE }, 4, 1, 'FA was read; one movement waits.'),
      regs: { 'EAX': reg('000000FE', 'AL = FE: the last byte') },
      memory: { focus: { id: 'vram', note: 'The mouse byte at (40, 96)', bytes: [0xA0000 + BYTE_Y * 320 + 40, 0xA0000 + BYTE_Y * 320 + 55] } },
      terminal: null,
    },
  },
  {
    id: 'C4',
    phase: 'C',
    title: 'What day 7 did',
    summary: 'Keys and mouse bytes arrive by interrupt, wait in ring buffers, and are shown by ' +
      'the main loop.',
    detail: 'Handlers are now short: end the interrupt, read one byte, queue it, return. ' +
      'The main loop sleeps until something is queued and does the drawing with interrupts ' +
      'on. The mouse is switched on and its bytes come in threes. Day 8 decodes them and ' +
      'moves the cursor.',
    hint: 'Next, day 8: decoding the mouse and moving the cursor.',
    milestone: { label: 'FIFO', text: 'Keyboard and mouse input' },
    time: '≈ 13 s',
    state: {
      code: { program: 'day7Mouse', focus: ['loop'], current: 'loop' },
      regs: { 'EIP': IN_MAIN, 'EFLAGS': reg('00000202', 'IF = 1: waiting for input'), 'EDX': reg('????????', 'Used by earlier code') },
      pic: PIC_OPEN,
      memory: { focus: null },
    },
  },
]);

export const DAY_07 = Object.freeze({
  id: 'day7',
  title: 'Day 7',
  name: 'Keyboard, mouse, FIFO',
  phases: PHASES,
  steps: STEPS,
});
