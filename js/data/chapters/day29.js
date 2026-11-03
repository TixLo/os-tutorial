// Day 29 (highlights): files on the disk can be compressed and are unpacked as they are
// loaded, apps get a small standard library, and two small apps show what the OS can do:
// a line drawing and a game.
// The programs are simplified teaching code (see js/data/programs/day29.js).

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { windowOps, box, lineOps } from '../screens.js';
import { osScreen, consoleTerminal } from './desktop640.js';
import { DAY_28 } from './day28.js';

const PHASES = Object.freeze({
  A: 'Smaller files, small apps',
});

const DAY_28_END = finalState(DAY_28.steps);

const show = (opts, lines) => ({
  graphics: osScreen({ lines, ...opts }),
  terminal: consoleTerminal(lines.slice(-8)),
});

// bball: 16 points on a circle, joined by lines colored by distance
const BX = 300;
const BY = 120;
const points = Array.from({ length: 16 }, (_, i) => {
  const angle = (i * Math.PI * 2) / 16;
  return [BX + 8 + 100 + Math.round(Math.cos(angle) * 96), BY + 28 + 100 + Math.round(Math.sin(angle) * 96)];
});
const BBALL = [
  ...windowOps(BX, BY, 216, 237, 'bball', true),
  box(C.black, BX + 8, BY + 29, BX + 207, BY + 228),
];
for (let i = 0; i <= 14; i++) {
  for (let j = i + 1; j <= 15; j++) {
    let dis = j - i;
    if (dis >= 8) dis = 15 - dis;
    if (dis !== 0) BBALL.push(...lineOps(...points[i], ...points[j], 8 - dis));
  }
}

// invader: rows of invaders as text, a cannon, and a score line
const IX = 120;
const IY = 60;
const INVADER = [
  ...windowOps(IX, IY, 336, 236, 'invader', true),
  box(C.black, IX + 6, IY + 27, IX + 329, IY + 228),
  { op: 'text', x: IX + 10, y: IY + 30, color: C.white, text: 'HIGH:00000000  SCORE:00000120' },
  ...[0, 1, 2, 3, 4, 5].map((row) => ({ op: 'text', x: IX + 34, y: IY + 56 + row * 16, color: C.green, text: '<o> <o> <o> <o> <o> <o>'.slice(0, row === 2 ? 15 : 23) })),
  { op: 'text', x: IX + 130, y: IY + 190, color: C.yellow, text: '|' },
  { op: 'text', x: IX + 122, y: IY + 210, color: C.cyan, text: '/^\\' },
];

const SIZE_TABLE = {
  title: 'Files before and after packing (example)',
  head: ['File', 'Original', 'Packed', 'Saved'],
  rows: [
    { cells: ['Two-byte font', '141,312', '46,400', '67%'], focus: true },
    { cells: ['kernel.sys', '15,672', '9,400', '40%'] },
    { cells: ['invader.app', '2,500', '1,700', '32%'] },
  ],
  note: 'A floppy holds 1.44 MB, so a big font file is worth packing. The numbers here are illustrative.',
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 28 stopped',
    summary: 'Apps can read files and the console can show two-byte text. The floppy is ' +
      'getting full, and writing apps is still more work than it should be.',
    detail: 'Today packs files to save space, adds the familiar C functions to the app ' +
      'library, and shows two small programs that use most of the OS: one drawing, one game.',
    time: '≈ 182 s',
    state: {
      ...DAY_28_END,
      ...show({}, ['>']),
      tab: 'code',
      visual: 'none',
      table: null,
      code: { program: 'day28Files', focus: null, current: null, trace: true },
      memory: { ...DAY_28_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Packed files',
    summary: 'Large files are stored compressed. file_loadfile2 recognizes a packed file by its ' +
      'header and unpacks it while loading, so the rest of the OS never notices.',
    detail: 'The book uses a compression format of its own. The idea is the usual one: repeated ' +
      'byte patterns are replaced by short references to where they appeared before. The ' +
      'two-byte font, which is mostly regular patterns, shrinks the most.',
    time: '≈ 183 s',
    state: {
      code: { program: 'day29Compress', focus: ['load', 'check', 'unpack'], current: null },
      visual: 'table',
      table: SIZE_TABLE,
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'A standard library',
    summary: 'printf, malloc, free, and friends are built on the API, so apps can be written ' +
      'like ordinary C programs.',
    detail: 'printf formats into a buffer and prints it with one API call. malloc stores the ' +
      'block\'s size just in front of it, so free needs only the pointer, as in standard C.',
    time: '≈ 183 s',
    state: {
      code: { program: 'day29Stdlib', focus: ['printf', 'malloc'], current: null },
      visual: 'none',
      table: null,
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'bball',
    summary: 'bball joins 16 points on a circle with lines, colored by how far apart the two ' +
      'points are.',
    detail: '120 lines through the line API from day 23, in a window from day 22. The color ' +
      'depends on the distance: white between neighbors, then cyan, magenta, and so on down ' +
      'to red between points almost opposite each other.',
    time: '≈ 184 s',
    state: {
      tab: 'memory',
      code: { program: 'day29Apps', focus: ['bball'], current: null },
      ...show({ extra: BBALL, consoleActive: false }, ['>bball']),
      memory: { focus: { id: 'vbe_vram', note: 'bball\'s window' } },
    },
  },
  {
    id: 'A4',
    phase: 'A',
    title: 'invader',
    summary: 'invader is a small shoot-\'em-up: a timer sets the pace, keys move the cannon and ' +
      'fire, and the screen is redrawn every frame.',
    detail: 'Everything it uses is already here: a window, text drawing, a timer, and ' +
      'api_getkey, which returns either a key or the timer\'s number. One loop waits, reacts, ' +
      'moves things, and redraws.',
    time: '≈ 190 s',
    state: {
      code: { focus: ['game'], current: null },
      ...show({ extra: INVADER, consoleActive: false }, ['>invader']),
      memory: { focus: { id: 'vbe_vram', note: 'invader\'s window' } },
    },
  },
  {
    id: 'A5',
    phase: 'A',
    title: 'What day 29 did',
    summary: 'Files can be packed, apps have a standard library, and the OS runs a drawing ' +
      'program and a game.',
    detail: 'The last day puts everything together in bigger applications: a calculator, a ' +
      'text viewer, a music player, and an image viewer.',
    hint: 'Next, day 30: larger applications.',
    milestone: { label: 'Games', text: 'Compression and small apps' },
    time: '≈ 190 s',
    state: {
      tab: 'code',
    },
  },
]);

export const DAY_29 = Object.freeze({
  id: 'day29',
  title: 'Day 29',
  name: 'Compression, small apps',
  phases: PHASES,
  steps: STEPS,
});
