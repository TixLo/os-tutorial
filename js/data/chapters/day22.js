// Day 22: applications in C, with assembly glue for the API and a header that tells the
// OS what an app needs; catching an app's bugs with the stack exception and Shift + F1;
// and windows opened by apps.
// The programs are simplified teaching code (see js/data/programs/day22.js).

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { windowOps, textOn, box } from '../screens.js';
import { osScreen, consoleTerminal } from './desktop640.js';
import { rootDirWrite, fatWrite, dirLines } from '../floppy.js';
import { DAY_21 } from './day21.js';

const PHASES = Object.freeze({
  A: 'Apps in C',
  B: 'Catching bugs',
  C: 'Windows for apps',
});

const DAY_21_END = finalState(DAY_21.steps);

const reg = (value, note) => ({ value, note });
const IN_CONSOLE = reg('0000E1··', 'In console_task');

const show = (lines, extra = []) => ({
  graphics: osScreen({ lines, extra }),
  terminal: consoleTerminal(lines.slice(-8)),
});

const WINHELO = [
  ...windowOps(300, 300, 150, 50, 'winhelo', false),
  box(C.yellow, 308, 336, 441, 343),
  ...textOn(328, 328, 'hello, world', C.black, C.lightGray),
];

const HEADER_TABLE = {
  title: 'hello2.app\'s header',
  head: ['Offset', 'Field', 'Value', 'Meaning'],
  rows: [
    { cells: ['0x00', 'segsiz', '0x00011000', 'Data segment: 68 KiB'] },
    { cells: ['0x04', 'sig', '"APP1"', 'This is an app'], focus: true },
    { cells: ['0x08', 'esp', '0x00010000', 'Stack top; data goes above it'] },
    { cells: ['0x0C', 'datsiz', '0x0000000E', '14 bytes of data: "hello, world\\n"'] },
    { cells: ['0x10', 'dathrb', '0x00000060', 'Where that data is in the file'] },
    { cells: ['0x14', 'entry', '0x00000020', 'app_main, right after the header'], focus: true },
  ],
  note: 'Anything without the signature gets ".app file format error." instead of being run.',
};

const API_TABLE = {
  title: 'INT 0x40 functions so far',
  head: ['EDX', 'Function'],
  rows: [
    { cells: ['1, 2, 3', 'Print a character or a string'] },
    { cells: ['4', 'End the app'] },
    { cells: ['5', 'Open a window: buffer, size, see-through color, title → handle'], focus: true },
    { cells: ['6', 'Text in a window'], focus: true },
    { cells: ['7', 'Filled box in a window'], focus: true },
  ],
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 21 stopped',
    summary: 'Apps are protected and can print, but they are written in assembly, which is slow ' +
      'going for anything bigger than a few lines.',
    detail: 'The kernel has been written in C since day 3. Apps can be too: a C compiler only ' +
      'needs a way to reach the API, a fixed entry point, and the OS loading the app\'s ' +
      'data where its code expects it.',
    time: '≈ 142 s',
    state: {
      ...DAY_21_END,
      ...show(['>dir', ...dirLines(22), '>']),
      tab: 'terminal',
      visual: 'none',
      table: null,
      code: { program: 'day21Exception', focus: ['handler'], current: null, trace: true },
      writes: { ...DAY_21_END.writes, rootDir: rootDirWrite(22), fat: fatWrite(22) },
      regs: { ...DAY_21_END.regs, 'EIP': IN_CONSOLE },
      memory: { ...DAY_21_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Glue between C and the API',
    summary: 'C can\'t execute int 0x40 itself, so a small assembly library has one function per ' +
      'API call: it copies the C arguments into registers and does int 0x40.',
    detail: 'With api_putstr0 and api_end, hello2.c is an ordinary C program. Its string ' +
      'lives in its data, not among its instructions, so the OS must put that data into the ' +
      'app\'s data segment before running it.',
    time: '≈ 143 s',
    state: {
      tab: 'code',
      code: { program: 'day22Glue', focus: ['glue', 'app'], current: null },
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'A header for apps',
    summary: 'Every .app file starts with 32 bytes, written by the linker: a signature, how ' +
      'big a data segment to make, the stack top, what data to copy where, and the entry ' +
      'point.',
    detail: 'The console checks the signature, allocates the data segment, copies the data in ' +
      'above the stack, and starts the app at its entry point with ESP at the stack top. ' +
      'hello2.app prints its line through the API and ends.',
    time: '≈ 144 s',
    state: {
      tab: 'terminal',
      code: { program: 'day22Header', focus: ['header', 'check', 'setup'], current: null },
      visual: 'table',
      table: HEADER_TABLE,
      ...show(['>hello2', 'hello, world', '>']),
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'A bug in an app',
    summary: 'bug.app writes far past the end of an array. The address is beyond the app\'s ' +
      'segment, and the CPU raises exception 0x0C, the stack exception.',
    detail: 'The array is on the stack, so the bad write goes through SS, and a stack segment ' +
      'out of bounds is exception 0x0C. Its handler prints the EIP the CPU saved, the offset ' +
      'of the faulty instruction inside the app, which points straight at the bug. Then the ' +
      'app is ended the same way as on day 21.',
    time: '≈ 145 s',
    state: {
      code: { program: 'day22Bugs', focus: ['bug', 'crash', 'gate', 'handler', 'eip'], current: null },
      visual: 'none',
      table: null,
      ...show(['>bug', 'INT 0C :', ' Stack Exception.', 'EIP = 0000003A', '>']),
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'An app that never stops',
    summary: 'A loop with no end keeps the console busy forever. Pressing Shift + F1 ends the ' +
      'app from outside.',
    detail: 'Task A, which handles the keyboard, sees Shift + F1 while the console runs an app ' +
      '(its tss.ss0 is set). It changes the console task\'s saved EIP to asm_end_app and EAX ' +
      'to the saved kernel stack. The next time the console task gets the CPU, it "continues" ' +
      'there and ends its app.',
    time: '≈ 147 s',
    state: {
      code: { focus: ['kill'], current: null },
      ...show(['>bug2', 'Break(key) :', '>']),
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'Window functions',
    summary: 'Three new API calls let an app open a window, write text in it, and draw boxes in ' +
      'it.',
    detail: 'The window\'s pixel buffer is in the app\'s own memory, passed as an offset in EBX, ' +
      'so the app\'s data segment must be big enough. API 5 returns the layer as a handle in ' +
      'EAX, by changing the EAX that asm_hrb_api will restore. The app passes that handle to ' +
      'functions 6 and 7.',
    time: '≈ 148 s',
    state: {
      code: { program: 'day22Window', focus: ['open', 'text', 'box'], current: null },
      visual: 'table',
      table: API_TABLE,
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'winhelo.app',
    summary: 'winhelo opens a 150 × 50 window, draws a yellow bar, and writes "hello, world" in ' +
      'it.',
    detail: 'The window is a layer like any other, at height 3, above task_a and the console ' +
      'and below the mouse. When the app ends, the window stays on screen, because nothing ' +
      'yet frees an app\'s layers: day 23 cleans up after apps.',
    time: '≈ 150 s',
    state: {
      tab: 'memory',
      code: { focus: ['app'], current: null },
      visual: 'none',
      table: null,
      ...show(['>winhelo', '>'], WINHELO),
      memory: { focus: { id: 'vbe_vram', note: 'The app\'s window on the screen' } },
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'What day 22 did',
    summary: 'Apps are written in C, carry a header, have their bugs caught and reported, can ' +
      'be stopped from the keyboard, and can open windows.',
    detail: 'This completes the path from a C file to a protected program with a window. Days ' +
      '23 to 30 build on it: more API functions, better window handling, sound, more ' +
      'consoles, files for apps, and bigger applications. Those days are covered as ' +
      'highlights.',
    hint: 'Next, day 23: drawing APIs and closing windows.',
    milestone: { label: 'C apps', text: 'Applications in C with windows' },
    time: '≈ 150 s',
    state: {
      tab: 'terminal',
    },
  },
]);

export const DAY_22 = Object.freeze({
  id: 'day22',
  title: 'Day 22',
  name: 'Applications in C',
  phases: PHASES,
  steps: STEPS,
});
