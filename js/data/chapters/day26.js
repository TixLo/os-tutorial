// Day 26 (highlights): faster redrawing by copying 4 bytes at a time and skipping
// in-between mouse positions, and consoles that open with Shift + F2, close with exit,
// and start apps with or without a window.
// The programs are simplified teaching code (see js/data/programs/day26.js).

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { windowOps, consoleOps, box, starOps } from '../screens.js';
import { osScreen, consoleTerminal } from './desktop640.js';
import { DAY_25 } from './day25.js';

const PHASES = Object.freeze({
  A: 'Faster, and more consoles',
});

const DAY_25_END = finalState(DAY_25.steps);

const show = (opts, lines) => ({
  graphics: osScreen({ lines, ...opts }),
  terminal: consoleTerminal(lines.slice(-8)),
});

const NEW_CONSOLE = (lines, active = true) => consoleOps(32, 4, lines, { active });
const STARS = [
  ...windowOps(420, 280, 150, 100, 'stars', false),
  box(C.black, 426, 306, 563, 373),
  ...starOps(426, 306, 137, 67, 50, C.yellow, 11),
];

const timeline = {
  title: 'Six mouse packets while the CPU is busy',
  start: 0, end: 60, unit: 'ms',
  lanes: [
    { name: 'packets', marks: [5, 13, 21, 29, 37, 45].map((at) => ({ at })) },
    { name: 'day 25', spans: [5, 13, 21, 29, 37, 45].map((from) => ({ from, to: from + 7, label: 'redraw' })) },
    { name: 'day 26', spans: [{ from: 47, to: 54, label: 'redraw once', kind: 'os' }] },
  ],
  note: 'Each redraw used to follow its packet; now only the last position is drawn, once the FIFO is empty.',
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 25 stopped',
    summary: 'Two consoles run side by side. Dragging windows feels slow, and the number of ' +
      'consoles is fixed when the OS starts.',
    detail: 'Today\'s first half makes moving things on screen cheaper; the second half lets ' +
      'the user open and close consoles, and start apps in new ones.',
    time: '≈ 170 s',
    state: {
      ...DAY_25_END,
      ...show({}, ['>']),
      tab: 'code',
      visual: 'none',
      table: null,
      code: { program: 'day25Consoles', focus: null, current: null, trace: true },
      memory: { ...DAY_25_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Four bytes at a time',
    summary: 'For opaque layers lined up on 4-byte boundaries, the map and screen are filled ' +
      'with 32-bit writes, four pixels per instruction.',
    detail: 'A 32-bit CPU moves 4 bytes as fast as 1. The see-through test is skipped for ' +
      'layers that have no see-through color, which is most windows. Edges that don\'t line ' +
      'up are still done byte by byte.',
    formula: 'sid4 = sid × 0x01010101: the same byte in all four positions',
    time: '≈ 170 s',
    state: {
      code: { program: 'day26Fast', focus: ['fast'], current: null },
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Skip positions nobody sees',
    summary: 'Task A no longer moves the cursor for every packet. It notes the newest position ' +
      'and moves the cursor once, when its FIFO is empty.',
    detail: 'If six packets arrive while task A is busy, only the last position matters. The ' +
      'same goes for a dragged window. Fewer redraws means the cursor keeps up with the hand.',
    time: '≈ 171 s',
    state: {
      code: { focus: ['lazy'], current: null },
      visual: 'timeline',
      timeline,
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'Shift + F2: a new console',
    summary: 'Pressing Shift + F2 opens another console, with its own window and task, at the ' +
      'top left.',
    detail: 'open_console does what kernel_main did at startup: a layer, a window, a task, a ' +
      'stack. Consoles are no longer a fixed number.',
    time: '≈ 172 s',
    state: {
      tab: 'terminal',
      visual: 'none',
      code: { program: 'day26Consoles', focus: ['open'], current: null },
      ...show({ extra: NEW_CONSOLE(['>']), consoleActive: false }, ['>']),
      terminal: consoleTerminal(['>']),
    },
  },
  {
    id: 'A4',
    phase: 'A',
    title: 'exit',
    summary: '"exit" closes the console it is typed in. The console asks task A to free its ' +
      'window, task, and memory, and sleeps until it is gone.',
    detail: 'A task can\'t free its own stack while running on it, so it sends task A a ' +
      'request through the FIFO, using a new range of numbers, 768 and up, one per layer.',
    time: '≈ 174 s',
    state: {
      code: { focus: ['exit'], current: null },
      ...show({ consoleActive: true }, ['>']),
    },
  },
  {
    id: 'A5',
    phase: 'A',
    title: 'start and ncst',
    summary: '"start stars" opens a new console and runs stars there. "ncst stars" runs it ' +
      'with a console task that has no window at all.',
    detail: 'Both work by typing the command into the new console task\'s FIFO, Enter ' +
      'included, exactly as if the user had. With ncst only the app\'s own window appears, ' +
      'which is what a graphical program wants.',
    time: '≈ 176 s',
    state: {
      tab: 'memory',
      code: { focus: ['start', 'ncst'], current: null },
      ...show({ extra: STARS, consoleActive: false }, ['>ncst stars', '>']),
      memory: { focus: { id: 'vbe_vram', note: 'stars, run without a console window' } },
    },
  },
  {
    id: 'A6',
    phase: 'A',
    title: 'What day 26 did',
    summary: 'Redrawing is faster, the cursor skips positions no one sees, and consoles open, ' +
      'close, and start apps on demand.',
    detail: 'With several consoles each running an app, a problem appears that the GDT ' +
      'entries 1003 and 1004 have been hiding. Day 27 solves it.',
    hint: 'Next, day 27: LDT and libraries.',
    milestone: { label: 'Speed', text: 'Faster windows, consoles on demand' },
    time: '≈ 176 s',
    state: {
      tab: 'code',
    },
  },
]);

export const DAY_26 = Object.freeze({
  id: 'day26',
  title: 'Day 26',
  name: 'Faster, more consoles',
  phases: PHASES,
  steps: STEPS,
});
