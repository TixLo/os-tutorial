// Day 28 (highlights): apps can read files and their own command line, and the console
// can show text in two-byte character sets, where one character takes two bytes and a
// 16 × 16 picture.
// The programs are simplified teaching code (see js/data/programs/day28.js).

import { finalState } from '../../core/state.js';
import { osScreen, consoleTerminal } from './desktop640.js';
import { HELLO_TEXT } from '../floppy.js';
import { DAY_27 } from './day27.js';

const PHASES = Object.freeze({
  A: 'Files and text',
});

const DAY_27_END = finalState(DAY_27.steps);

const show = (lines) => ({
  graphics: osScreen({ lines }),
  terminal: consoleTerminal(lines.slice(-8)),
});

const FILE_TABLE = {
  title: 'INT 0x40 functions for files',
  head: ['EDX', 'Function'],
  rows: [
    { cells: ['21', 'Open a file by name → handle'], focus: true },
    { cells: ['22', 'Close it'] },
    { cells: ['23', 'Move the position (from the start, here, or the end)'] },
    { cells: ['24', 'Get the size or the position'] },
    { cells: ['25', 'Read up to n bytes → how many were read'], focus: true },
    { cells: ['26', 'Copy the command line into the app'], focus: true },
  ],
  note: 'Opening loads the whole file into memory; reads and seeks just move a position.',
};

const BYTES_TABLE = {
  title: 'One byte or two?',
  head: ['First byte', 'Set', 'Means'],
  rows: [
    { cells: ['0x20–0x7E', 'Any', 'An ASCII character: one byte, 8 × 16'] },
    { cells: ['0xA1–0xDF', 'Set 1', 'A half-width character: one byte'] },
    { cells: ['0x81–0x9F, 0xE0–0xFC', 'Set 1', 'The first of two bytes'], focus: true },
    { cells: ['0xA1–0xFE', 'Set 2', 'The first of two bytes; the second is also 0xA1–0xFE'], focus: true },
  ],
  note: 'A two-byte character is drawn as a 16 × 16 picture from a large font file loaded at startup.',
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 27 stopped',
    summary: 'Apps are well separated, but they can\'t read files or see what was typed after ' +
      'their name.',
    detail: 'Only the console could read files, through type. Today apps get the same ability ' +
      'through the API, plus the command line, which is enough to write type as an app. The ' +
      'second half is about text that needs more than one byte per character.',
    time: '≈ 178 s',
    state: {
      ...DAY_27_END,
      ...show(['>']),
      tab: 'code',
      visual: 'table',
      table: FILE_TABLE,
      code: { program: 'day28Files', focus: null, current: null, trace: true },
      memory: { ...DAY_27_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Big local arrays',
    summary: 'An app with a large local array would jump far down its stack at once. The ' +
      'compiler calls a helper that moves the stack pointer down in steps.',
    detail: 'The helper, __alloca, is part of the app library. For this OS it simply lowers ' +
      'ESP by the size asked for; the app\'s data segment must have room for it, which the ' +
      'header\'s stack size takes care of.',
    time: '≈ 178 s',
    state: {
      visual: 'none',
      table: null,
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Files for apps',
    summary: 'API 21 opens a file and returns a handle; 25 reads from it; 22 closes it. Seek ' +
      'and size complete the set.',
    detail: 'Opening finds the file in the root directory and loads all of it, following the ' +
      'FAT. The handle keeps the buffer, the size, and a position; reading copies bytes into ' +
      'the app\'s segment and moves the position. Files an app forgets to close are closed ' +
      'when it ends.',
    time: '≈ 179 s',
    state: {
      code: { focus: ['struct', 'open', 'close', 'seek', 'read'], current: null },
      visual: 'table',
      table: FILE_TABLE,
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'The command line',
    summary: 'API 26 copies the console\'s command line into the app. cat.app uses it to open ' +
      'the file named after its own name.',
    detail: '"cat hello.txt" runs cat.app, which skips its own name, opens hello.txt, and ' +
      'prints it byte by byte. type no longer needs to be part of the console.',
    time: '≈ 180 s',
    state: {
      tab: 'terminal',
      code: { focus: ['cmdline', 'app'], current: null },
      ...show(['>cat hello.txt', HELLO_TEXT.trimEnd(), '>cat nothing.txt', 'File not found.', '>']),
    },
  },
  {
    id: 'A4',
    phase: 'A',
    title: 'Two bytes per character',
    summary: 'Languages with thousands of characters store most of them in two bytes. The first ' +
      'byte\'s value says whether a second one follows.',
    detail: 'The console keeps the first byte of a pair in langbyte1 and draws nothing until ' +
      'the second arrives, then looks up the pair\'s 16 × 16 picture and draws it across two ' +
      'character cells. Two common encodings use different byte ranges, so the console must ' +
      'be told which one the text uses.',
    time: '≈ 181 s',
    state: {
      tab: 'code',
      code: { program: 'day28Text', focus: ['put', 'two', 'lead', 'second'], current: null },
      visual: 'table',
      table: BYTES_TABLE,
    },
  },
  {
    id: 'A5',
    phase: 'A',
    title: 'langmode',
    summary: 'The langmode command picks the character set per task: 0 for single bytes, 1 or ' +
      '2 for the two-byte encodings.',
    detail: 'Each console, and each app it runs, can use a different set. On this site the ' +
      'console stays in mode 0, since its font only has the ASCII characters.',
    time: '≈ 182 s',
    state: {
      tab: 'terminal',
      code: { focus: ['cmd', 'mode'], current: null },
      visual: 'none',
      table: null,
      ...show(['>langmode 0', '>']),
    },
  },
  {
    id: 'A6',
    phase: 'A',
    title: 'What day 28 did',
    summary: 'Apps open, read, and seek files and get their command line, and the console ' +
      'handles two-byte character sets.',
    detail: 'The OS is nearly complete. Day 29 makes files smaller with compression and gives ' +
      'apps a standard library, then shows a couple of small programs.',
    hint: 'Next, day 29: compression and small apps.',
    milestone: { label: 'Files', text: 'Files for apps' },
    time: '≈ 182 s',
    state: {},
  },
]);

export const DAY_28 = Object.freeze({
  id: 'day28',
  title: 'Day 28',
  name: 'Files and text',
  phases: PHASES,
  steps: STEPS,
});
