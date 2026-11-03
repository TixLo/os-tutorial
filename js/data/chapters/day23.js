// Day 23 (highlights): apps get malloc, points, lines, control over when the screen is
// refreshed, closing windows, and keyboard input; ending an app closes its windows.
// The programs are simplified teaching code (see js/data/programs/day23.js).

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { windowOps, box, lineOps, starOps } from '../screens.js';
import { osScreen, consoleTerminal } from './desktop640.js';
import { DAY_22 } from './day22.js';

const PHASES = Object.freeze({
  A: 'Drawing for apps',
});

const DAY_22_END = finalState(DAY_22.steps);
const reg = (value, note) => ({ value, note });

const show = (lines, extra = []) => ({
  graphics: osScreen({ lines, extra }),
  terminal: consoleTerminal(lines.slice(-8)),
});

const STARS = [
  ...windowOps(300, 250, 150, 100, 'stars'),
  box(C.black, 306, 276, 443, 343),
  ...starOps(306, 276, 137, 67, 50, C.yellow, 7),
];
const LINES = [
  ...windowOps(470, 150, 160, 100, 'lines', false),
  box(C.black, 476, 176, 623, 243),
  ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => [
    ...lineOps(478, 178, 478 + i * 20, 241, 1 + (i % 7)),
    ...lineOps(478, 178, 621, 178 + i * 9, 1 + ((i + 3) % 7)),
  ]),
];

const API_TABLE = {
  title: 'INT 0x40 functions added today',
  head: ['EDX', 'Function'],
  rows: [
    { cells: ['8, 9, 10', 'Set up malloc, malloc, free (inside the app\'s segment)'] },
    { cells: ['11', 'Draw one point'] },
    { cells: ['12', 'Refresh a rectangle of a window'] },
    { cells: ['13', 'Draw a line'] },
    { cells: ['14', 'Close a window'] },
    { cells: ['15', 'Read a key, or wait for one'] },
  ],
  note: 'A window handle + 1 means "draw, but don\'t refresh yet".',
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 22 stopped',
    summary: 'Apps can open windows and put text and boxes in them. To draw anything else they ' +
      'need more from the API, and their windows never go away.',
    detail: 'Today\'s additions are all small API functions, each a few lines in hrb_api. ' +
      'Together they are enough for real programs: a starfield, line drawings, and apps ' +
      'that wait for a key and clean up after themselves.',
    time: '≈ 150 s',
    state: {
      ...DAY_22_END,
      ...show(['>']),
      tab: 'code',
      visual: 'table',
      table: API_TABLE,
      code: { program: 'day23Api', focus: null, current: null, trace: true },
      regs: { ...DAY_22_END.regs, 'EIP': reg('0000E1··', 'In console_task') },
      memory: { ...DAY_22_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'malloc for apps',
    summary: 'An app can ask for memory inside its own data segment. The OS runs the same ' +
      'memory manager from day 9, but on a table that lives in the app\'s segment.',
    detail: 'API 8 sets up the table and gives it the free part of the segment, API 9 hands ' +
      'out blocks rounded up to 16 bytes, API 10 takes them back. The app\'s memory stays ' +
      'the app\'s: everything happens inside its own segment.',
    time: '≈ 151 s',
    state: {
      code: { focus: ['malloc'], current: null },
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Points, and refreshing once',
    summary: 'stars.app draws 50 points with API 11, telling the OS not to refresh after each, ' +
      'then refreshes the whole area once with API 12.',
    detail: 'Refreshing after every point would redraw the same window 50 times. Window ' +
      'handles are addresses and always even, so bit 0 is free to mean "don\'t refresh". ' +
      'The app passes win + 1 while drawing and win to refresh.',
    time: '≈ 152 s',
    state: {
      tab: 'memory',
      visual: 'none',
      ...show(['>stars'], STARS),
      code: { program: 'day23Stars', focus: ['mem', 'draw'], current: 'wait' },
      memory: { focus: { id: 'vbe_vram', note: 'The stars window' } },
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'Lines',
    summary: 'API 13 draws a line by stepping one pixel at a time along the longer direction ' +
      'and a fraction of a pixel along the other.',
    detail: 'The fractions are kept as fixed-point numbers, in 1/1024ths of a pixel, so the ' +
      'loop needs only additions and shifts, no division per pixel. Sixteen lines in seven ' +
      'colors fan out from a corner here.',
    formula: 'from (0, 0) to (4, 2): x steps 1024, y steps 512 → (0,0) (1,1) (2,1) (3,2) (4,2)',
    time: '≈ 153 s',
    state: {
      tab: 'code',
      ...show(['>stars', '>lines'], [...STARS, ...LINES]),
      code: { program: 'day23Api', focus: ['line'], current: null },
    },
  },
  {
    id: 'A4',
    phase: 'A',
    title: 'Keys, and closing up',
    summary: 'API 15 lets an app read keys, waiting for one if it wants to. API 14 closes a ' +
      'window, and when an app ends, the OS closes any window it left open.',
    detail: 'Keys typed while an app runs in the console go to the console task\'s FIFO, and ' +
      'API 15 takes them from there. stars.app waits for Enter, then closes its window. If it ' +
      'had forgotten, or been stopped with Shift + F1, the OS would free its layers anyway, ' +
      'because each layer now records which task opened it.',
    time: '≈ 158 s',
    state: {
      ...show(['>stars', '>lines', '>'], LINES),
      code: { focus: ['close', 'key', 'cleanup'], current: null },
    },
  },
  {
    id: 'A5',
    phase: 'A',
    title: 'What day 23 did',
    summary: 'Apps can allocate memory, draw points and lines, control refreshing, read keys, ' +
      'and close windows, and the OS cleans up after them.',
    detail: 'The API now has 15 functions. Day 24 turns to the windows themselves: switching ' +
      'between them, moving them by their title bars, closing them with the mouse, and ' +
      'timers for apps.',
    hint: 'Next, day 24: window switching and timers for apps.',
    milestone: { label: 'Graphics', text: 'Drawing APIs for apps' },
    time: '≈ 158 s',
    state: {
      visual: 'table',
    },
  },
]);

export const DAY_23 = Object.freeze({
  id: 'day23',
  title: 'Day 23',
  name: 'Drawing APIs',
  phases: PHASES,
  steps: STEPS,
});
