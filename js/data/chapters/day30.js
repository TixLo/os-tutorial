// Day 30 (highlights): four larger applications that use the whole OS, and a look back
// at what the 30 days built.
// The programs are simplified teaching code (see js/data/programs/day30.js).

import { finalState } from '../../core/state.js';
import { C, cube } from '../palettes.js';
import { windowOps, box } from '../screens.js';
import { osScreen, consoleTerminal } from './desktop640.js';
import { HELLO_TEXT } from '../floppy.js';
import { DAY_29 } from './day29.js';

const PHASES = Object.freeze({
  A: 'Larger applications',
  B: 'Thirty days',
});

const DAY_29_END = finalState(DAY_29.steps);

const show = (opts, lines) => ({
  graphics: osScreen({ lines, ...opts }),
  terminal: consoleTerminal(lines.slice(-8)),
});

const TVIEW = (() => {
  const x = 300;
  const y = 120;
  const text = [HELLO_TEXT.trimEnd(), '', 'tview shows a file in a window', 'of its own. Keys 8 and 2 scroll,', '4 and 6 move sideways, q quits.'];
  return [
    ...windowOps(x, y, 272, 124, 'tview', true),
    box(C.white, x + 6, y + 27, x + 265, y + 117),
    ...text.map((line, row) => ({ op: 'text', x: x + 8, y: y + 28 + row * 16, color: C.black, text: line.slice(0, 32) })),
  ];
})();

// A picture made from the 216-color cube: a sky-to-ground gradient with a sun
const GVIEW = (() => {
  const x = 260;
  const y = 70;
  const ops = [...windowOps(x, y, 176, 156, 'gview', true)];
  for (let row = 0; row < 8; row++) {
    ops.push(box(cube(row < 5 ? 1 : 1, row < 5 ? 2 + Math.floor(row / 2) : 3, row < 5 ? 5 - Math.floor(row / 3) : 1),
      x + 8, y + 28 + row * 15, x + 167, y + 28 + row * 15 + 14));
  }
  ops.push(box(cube(5, 5, 1), x + 120, y + 40, x + 147, y + 67));
  ops.push(box(cube(1, 3, 0), x + 8, y + 118, x + 167, y + 147));
  return ops;
})();

const BUILT_TABLE = {
  title: 'What the 30 days built',
  head: ['Days', 'Part'],
  rows: [
    { cells: ['0–3', 'Boot: BIOS, IPL, loading the kernel, protected mode, C'] },
    { cells: ['4–5', 'Graphics: video memory, palette, font, cursor, GDT and IDT'] },
    { cells: ['6–8', 'Interrupts: PIC, keyboard, mouse, FIFOs'] },
    { cells: ['9–11', 'Memory management and layers'] },
    { cells: ['12–16', 'Timers and multitasking'] },
    { cells: ['17–22', 'Console, files, applications, system calls, protection'] },
    { cells: ['23–30', 'APIs, windows, sound, LDT, files for apps, larger apps'] },
  ],
  note: 'All of it fits on one 1.44 MB floppy, applications included.',
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 29 stopped',
    summary: 'The OS runs drawings and games. The last day is about applications that need a ' +
      'bit more code than the OS itself provides.',
    detail: 'None of these needs new kernel features: they are built from the API, the file ' +
      'functions, the timers, the beep, and the 216-color palette, which is the point. An OS ' +
      'is finished when people can write programs for it without changing it.',
    time: '≈ 190 s',
    state: {
      ...DAY_29_END,
      ...show({}, ['>']),
      tab: 'code',
      visual: 'none',
      table: null,
      code: { program: 'day29Apps', focus: null, current: null, trace: true },
      memory: { ...DAY_29_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'calc',
    summary: 'calc evaluates the expression on its command line, with * and / before + and -, ' +
      'and parentheses.',
    detail: 'getnum reads a number and then keeps applying operators as long as they bind ' +
      'more tightly than the caller\'s, calling itself for the right-hand side. That is ' +
      'enough to get 123 + 456 × 2 right.',
    formula: '123+456*2 → 123 + (456 × 2) = 1035 = 0x40B',
    time: '≈ 191 s',
    state: {
      tab: 'terminal',
      code: { program: 'day30Calc', focus: ['parse', 'prec', 'main'], current: null },
      ...show({}, ['>calc 123+456*2', '= 1035 = 0x40B', '>']),
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'tview',
    summary: 'tview opens a text file in a window of a chosen size and scrolls it with the ' +
      'keys.',
    detail: 'It reads the file with the file API, draws the visible lines, and redraws as the ' +
      'keys move through it. Options on the command line set the window size and tab width.',
    time: '≈ 193 s',
    state: {
      tab: 'memory',
      code: { program: 'day30Tview', focus: ['usage', 'loop', 'keys'], current: null },
      ...show({ extra: TVIEW, consoleActive: false }, ['>tview hello.txt']),
      memory: { focus: { id: 'vbe_vram', note: 'tview\'s window' } },
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'mmlplay',
    summary: 'mmlplay plays music written as text: notes A to G, octaves, lengths, and tempo, ' +
      'through the beep API.',
    detail: 'Each note is a frequency from a table, shifted for the octave, held for its length ' +
      'with a timer. The PC speaker can play only one tone at a time, so the music is a ' +
      'single melody line.',
    formula: 'T120 O4 L8 CDEFGAB>C: tempo 120, octave 4, eighth notes, a scale',
    time: '≈ 196 s',
    state: {
      tab: 'terminal',
      code: { program: 'day30Mml', focus: ['table', 'loop', 'note', 'cmd'], current: null },
      ...show({}, ['>mmlplay scale.mml', '>']),
      terminal: { lines: ['> watch ports 0x42 0x61', 'C4 262 Hz: count 4554', 'D4 294 Hz: count 4058', 'E4 330 Hz: count 3616', 'F4 349 Hz: count 3419', 'G4 392 Hz: count 3044', '... speaker off'] },
    },
  },
  {
    id: 'A4',
    phase: 'A',
    title: 'gview',
    summary: 'gview decodes a BMP or JPEG image and shows it in a window, mapping each pixel to ' +
      'the nearest of the 216 colors.',
    detail: 'JPEG decoding is the biggest piece of code on the disk, all of it in the app. Where ' +
      'the nearest color is off, dithering alternates neighbors so the average looks right, ' +
      'the trick from day 25.',
    time: '≈ 199 s',
    state: {
      tab: 'memory',
      code: { program: 'day30Gview', focus: ['load', 'detect', 'decode', 'show'], current: null },
      ...show({ extra: GVIEW, consoleActive: false }, ['>gview picture.jpg']),
      memory: { focus: { id: 'vbe_vram', note: 'gview\'s window' } },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'What 30 days built',
    summary: 'From the power button to a protected, multitasking OS with windows, files, and ' +
      'applications in C.',
    detail: 'Every layer rests on the one below: the boot loader on the BIOS, protected mode ' +
      'on the loader, interrupts on the IDT, the console on tasks and layers, applications on ' +
      'the console and the API. Each day on this site showed one of those steps happening ' +
      'inside the machine.',
    time: '≈ 199 s',
    state: {
      tab: 'code',
      visual: 'table',
      table: BUILT_TABLE,
      code: { program: 'day30Gview', focus: null, current: null },
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'The end',
    summary: 'That is the whole book, day by day. Pick any day from the menu to see it again, ' +
      'or press the power button to start over from day 0.',
    detail: 'The code on this site is written for teaching and simplified from day 3 on; the ' +
      'book has the complete source and much more detail. Read it alongside this site, try ' +
      'the code, and change things to see what happens.',
    hint: 'Thanks for following along.',
    milestone: { label: 'Done', text: 'All 30 days' },
    time: '≈ 199 s',
    state: {
      ...show({}, ['>']),
      visual: 'none',
      table: null,
      tab: 'memory',
      memory: { focus: { id: 'vbe_vram', note: 'The finished OS' } },
    },
  },
]);

export const DAY_30 = Object.freeze({
  id: 'day30',
  title: 'Day 30',
  name: 'Larger applications',
  phases: PHASES,
  steps: STEPS,
});
