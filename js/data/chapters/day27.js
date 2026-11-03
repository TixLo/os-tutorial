// Day 27 (highlights): two consoles running apps used the same GDT entries for their
// apps' segments, so each task gets its own local descriptor table (LDT). The API glue
// becomes a library, so apps only carry the functions they use.
// The programs are simplified teaching code (see js/data/programs/day27.js).

import { finalState } from '../../core/state.js';
import { consoleOps } from '../screens.js';
import { osScreen, consoleTerminal } from './desktop640.js';
import { DAY_26 } from './day26.js';

const PHASES = Object.freeze({
  A: 'LDT and libraries',
});

const DAY_26_END = finalState(DAY_26.steps);
const reg = (value, note) => ({ value, note });

const show = (opts, lines) => ({
  graphics: osScreen({ lines, ...opts }),
  terminal: consoleTerminal(lines.slice(-8)),
});

const SELECTOR_TABLE = {
  title: 'A selector, bit by bit',
  head: ['Bits', 'Name', 'In 0x000C'],
  rows: [
    { cells: ['15–3', 'Index', '1: the second entry'] },
    { cells: ['2', 'TI: table', '1: the LDT, not the GDT'], focus: true },
    { cells: ['1–0', 'RPL: requested level', '3 for app code and data (0x0F, 0x07 when used)'] },
  ],
  note: 'App code is selector 0x07 (LDT entry 0, level 3); app data is 0x0F (entry 1, level 3).',
};

const LDT_TABLE = {
  title: 'GDT layout with LDTs',
  head: ['GDT entries', 'Hold', 'Per task'],
  rows: [
    { cells: ['1, 2', 'Kernel code and data', '—'], dim: true },
    { cells: ['3 – 1002', 'Each task\'s TSS', '1'] },
    { cells: ['1003 – 2002', 'Each task\'s LDT (2 entries, 16 bytes)', '1'], focus: true },
  ],
  note: 'TSS.ldtr names the task\'s LDT; the CPU switches LDT with every task switch.',
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 26 stopped',
    summary: 'Consoles open on demand. Run an app in each of two consoles, though, and the ' +
      'first one breaks.',
    detail: 'Every app\'s code and data segments were GDT entries 1003 and 1004. Starting a ' +
      'second app overwrote them with the second app\'s addresses, so when the first app ' +
      'next ran, its selectors pointed at the second app\'s memory.',
    time: '≈ 176 s',
    state: {
      ...DAY_26_END,
      ...show({ extra: consoleOps(32, 4, ['>color'], { active: false }), consoleActive: true }, ['>color2']),
      tab: 'code',
      visual: 'none',
      table: null,
      timeline: null,
      code: { program: 'day22Header', focus: ['setup'], current: null, trace: true },
      memory: { ...DAY_26_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'A table per task',
    summary: 'Each task gets a local descriptor table: a small table of its own, with two ' +
      'entries for its app\'s code and data.',
    detail: 'An LDT is itself described by a GDT entry, and each task\'s TSS names its LDT in ' +
      'the ldtr field. When the CPU switches tasks it switches LDTs too, so the same app ' +
      'selectors mean different memory in each task.',
    time: '≈ 177 s',
    state: {
      code: { program: 'day27Ldt', focus: ['struct', 'init'], current: null },
      visual: 'table',
      table: LDT_TABLE,
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Selectors into the LDT',
    summary: 'Bit 2 of a selector, TI, says which table to use. With it set, the app\'s ' +
      'selectors point into the current task\'s LDT.',
    detail: 'cmd_app puts the app\'s segments into task->ldt[0] and [1] and starts the app ' +
      'with selectors 0 × 8 + 4 and 1 × 8 + 4. An app can\'t even name another task\'s ' +
      'segments: its LDT contains only its own.',
    time: '≈ 177 s',
    state: {
      code: { focus: ['app'], current: null },
      table: SELECTOR_TABLE,
      regs: {
        'CS': reg('0007', 'LDT entry 0, level 3: this task\'s app code'),
        'DS / ES / SS': reg('000F', 'LDT entry 1, level 3: this task\'s app data'),
      },
      csip: '0007:00000000',
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'Two apps, side by side',
    summary: 'Both consoles now run their apps correctly at the same time, each with the same ' +
      'selectors and different memory.',
    detail: 'The task switch that already saves and loads registers now also loads the LDT ' +
      'register from the TSS. Nothing in the apps changed.',
    time: '≈ 178 s',
    state: {
      tab: 'terminal',
      visual: 'none',
      table: null,
      ...show({ extra: consoleOps(32, 4, ['>color', '>'], { active: false }), consoleActive: true }, ['>color2', '>']),
      regs: { 'CS': reg('0008', 'Kernel code'), 'DS / ES / SS': reg('0010', 'Kernel data') },
      csip: '0008:0000E1··',
    },
  },
  {
    id: 'A4',
    phase: 'A',
    title: 'A library for the API',
    summary: 'The API glue is split into one small file per function and collected into a ' +
      'library. An app links in only the functions it calls.',
    detail: 'Before, every app carried all the glue functions. With a library the linker ' +
      'picks what is needed: hello2 needs api_putstr0 and api_end, so its file shrinks. The ' +
      'book also tidies its build here so the OS, apps, and library build separately.',
    time: '≈ 178 s',
    state: {
      tab: 'code',
      code: { program: 'day27Lib', focus: ['files', 'lib', 'link'], current: null },
    },
  },
  {
    id: 'A5',
    phase: 'A',
    title: 'What day 27 did',
    summary: 'Each task has its own LDT, so apps in different consoles can\'t collide, and apps ' +
      'are linked against a library.',
    detail: 'Next, apps get to read files themselves and receive their command line, and the ' +
      'console learns to show text in two-byte character sets.',
    hint: 'Next, day 28: files for apps and character sets.',
    milestone: { label: 'LDT', text: 'An LDT per task' },
    time: '≈ 178 s',
    state: {},
  },
]);

export const DAY_27 = Object.freeze({
  id: 'day27',
  title: 'Day 27',
  name: 'LDT and libraries',
  phases: PHASES,
  steps: STEPS,
});
