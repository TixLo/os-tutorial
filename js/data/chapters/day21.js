// Day 21: an application can overwrite the OS, so each app gets a data segment of its own
// and runs at privilege level 3, where loading the kernel's segments or running privileged
// instructions raises an exception that ends the app.
// The programs are simplified teaching code (see js/data/programs/day21.js).

import { finalState } from '../../core/state.js';
import { osScreen, consoleTerminal } from './desktop640.js';
import { ROOT_ADDR, filesOnDay, rootDirWrite, fatWrite, fileWrite, dirLines, dirEntry } from '../floppy.js';
import { CRACK2_BYTES } from '../programs/day21.js';
import { DAY_20 } from './day20.js';

const PHASES = Object.freeze({
  A: 'An unprotected OS',
  B: 'A data segment per app',
  C: 'Privilege levels',
});

const DAY_20_END = finalState(DAY_20.steps);

const reg = (value, note) => ({ value, note });
const IN_CONSOLE = reg('0000E1··', 'In console_task');

const CRACK = filesOnDay(21).find((f) => f.name === 'CRACK');
const APP_CODE = 0x4CC000;
const APP_DATA = 0x4CD000;

const show = (lines) => ({
  graphics: osScreen({ lines }),
  terminal: consoleTerminal(lines.slice(-8)),
});

// After crack v1: the root directory's first byte is 0, so dir sees no files at all
const CRACKED_ROOT = (() => {
  const write = rootDirWrite(21);
  const bytes = filesOnDay(21).flatMap(dirEntry);
  bytes[0] = 0;
  return { ...write, data: [[ROOT_ADDR, bytes]] };
})();

const LAYOUT = [
  ...DAY_20_END.memory.layout.filter((region) => region.id !== 'app_code'),
  { id: 'app_code', start: APP_CODE, end: APP_CODE + 0xFFF, name: 'The app\'s code (segment 1003)', kind: 'ram' },
  { id: 'app_data', start: APP_DATA, end: APP_DATA + 0xFFFF, name: 'The app\'s data and stack (segment 1004)', kind: 'ram' },
];

const descriptor = (base, limit, access, flags) => [
  limit & 0xFF, (limit >> 8) & 0xFF, base & 0xFF, (base >> 8) & 0xFF, (base >> 16) & 0xFF,
  access, flags | ((limit >> 16) & 0x0F), (base >>> 24) & 0xFF,
];
const APP_CODE_DESC = descriptor(APP_CODE, CRACK.size - 1, 0xFA, 0x40);
const APP_DATA_DESC = descriptor(APP_DATA, 0xFFFF, 0xF2, 0x40);

const RING_TABLE = {
  title: 'Segments by privilege level',
  head: ['Selector', 'Segment', 'Level (DPL)', 'Access byte'],
  rows: [
    { cells: ['0x0008', 'Kernel code', '0', '9A'], dim: true },
    { cells: ['0x0010', 'Kernel data, all 4 GiB', '0', '92'], dim: true },
    { cells: ['0x1F5B', 'App code (1003 × 8 + 3)', '3', 'FA = 9A + 60'], focus: true },
    { cells: ['0x1F63', 'App data (1004 × 8 + 3)', '3', 'F2 = 92 + 60'], focus: true },
  ],
  note: 'Code at level 3 may only load level-3 data segments, and may not run cli, hlt, in, or out.',
};

const GPF_TRACE = [
  '> trace crack.app (protected)',
  'start_app: retf to 1F5B:00000000, level 3',
  'mov ax, 0x10',
  'mov ds, ax   -> selector 0x10 is level 0: not allowed',
  'CPU: exception 0x0D (general protection)',
  'CPU: level 3 -> 0, ESP from tss.esp0, jump via IDT[0x0D]',
  'inthandler0d: message, end the app',
];

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 20 stopped',
    summary: 'Apps run and call the OS. But an app runs with the same rights as the kernel and ' +
      'can write anywhere in memory.',
    detail: 'Its data segment is still the kernel\'s, covering all 4 GiB from address 0. One ' +
      'wrong pointer in an app, let alone a deliberate attack, can wreck the kernel\'s tables, ' +
      'other tasks, or the disk image. Today the CPU\'s protection features stop that.',
    time: '≈ 138 s',
    state: {
      ...DAY_20_END,
      ...show(['>hello', 'hello', '>']),
      tab: 'code',
      visual: 'none',
      table: null,
      code: { program: 'day20Hello', focus: ['loop'], current: null, trace: true },
      writes: { ...DAY_20_END.writes, rootDir: rootDirWrite(21), fat: fatWrite(21), crackApp: fileWrite(CRACK, [...CRACK2_BYTES]), appLoaded: null },
      regs: {
        ...DAY_20_END.regs,
        'CS': reg('0008', 'Kernel code'),
        'EIP': IN_CONSOLE,
        'EAX': reg('????????', 'Used by earlier code'),
        'ECX': reg('????????', 'Used by earlier code'),
        'EDX': reg('????????', 'Used by earlier code'),
      },
      memory: { ...DAY_20_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'An app breaks the OS',
    summary: 'The first version of crack.app writes a 0 to {0xA600}, the first byte of the ' +
      'root directory. Afterward, dir lists nothing.',
    detail: 'A first byte of 00 means "no more entries", so for the OS every file on the disk ' +
      'is gone. Nothing stopped the write: the app\'s DS was the kernel\'s data segment. It ' +
      'could just as easily have overwritten the GDT, the IDT, or the kernel\'s code.',
    time: '≈ 140 s',
    state: {
      tab: 'memory',
      code: { program: 'day21Crack', focus: ['v1'], current: null },
      ...show(['>crack', '>dir', '>']),
      writes: { rootDir: CRACKED_ROOT },
      memory: { focus: { id: 'disk_image', note: 'The root directory: its first byte is now 00', bytes: [ROOT_ADDR, ROOT_ADDR + 0x1F] } },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'A data segment of its own',
    summary: 'The console gives each app a second segment, GDT entry 1004, covering only 64 KiB ' +
      'of memory set aside for the app\'s data and stack, and makes it the app\'s DS.',
    detail: 'With DS based at the app\'s own block, address 0xA600 means 0xA600 bytes into that ' +
      'block, not the root directory. The write lands in the app\'s own memory and the OS is ' +
      'safe. The disk is fresh again after a restart.',
    formula: 'DS base 0x4CD000 → [0xA600] is 0x4CD000 + 0xA600 = 0x4D7600, inside the app\'s block',
    time: '≈ 140 s',
    state: {
      tab: 'code',
      code: { program: 'day21Segments', focus: ['alloc', 'seg'], current: 'start' },
      ...show(['>crack', '>dir', ...dirLines(21), '>']),
      writes: { rootDir: rootDirWrite(21) },
      memory: { layout: LAYOUT, focus: { id: 'app_data', note: 'The app\'s own data segment' } },
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'The app picks another segment',
    summary: 'crack.app version 2 simply loads selector 0x10, the kernel\'s data segment, into ' +
      'DS itself, and writes again.',
    detail: 'Segment registers can be loaded by any code, and 0x10 is easy to guess. A ' +
      'separate segment only protects against accidents. Stopping a program that tries on ' +
      'purpose takes a rule the CPU enforces: privilege levels.',
    time: '≈ 140 s',
    state: {
      code: { program: 'day21Crack', focus: ['v2', 'load'], current: 'load' },
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'Privilege levels',
    summary: 'Every segment has a level from 0 (most trusted) to 3. The kernel\'s segments are ' +
      'level 0; the app\'s get level 3 by adding 0x60 to their access byte.',
    detail: 'Code running at level 3 can\'t load a level-0 data segment, can\'t run hlt, cli, ' +
      'in, or out, and can\'t jump into level-0 code except through gates the OS opens. The ' +
      'API gate, INT 0x40, is marked usable from level 3; all others are not.',
    time: '≈ 140 s',
    state: {
      visual: 'table',
      table: RING_TABLE,
      code: { program: 'day21Exception', focus: ['gate'], current: null },
      memory: { focus: { id: 'os_gdt', note: 'Entries 1003 and 1004: the app\'s segments', bytes: [0x270000 + 1003 * 8, 0x270000 + 1004 * 8 + 7] } },
      writes: {
        osGdt: {
          ...DAY_20_END.writes.osGdt,
          data: [...DAY_20_END.writes.osGdt.data, [0x270000 + 1003 * 8, [...APP_CODE_DESC, ...APP_DATA_DESC]]],
        },
      },
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'Entering level 3',
    summary: 'start_app builds a stack frame as if the app had called the kernel, then retf ' +
      '"returns" into the app at level 3.',
    detail: 'A far return to a lower privilege level pops CS, EIP, SS, and ESP, so the app gets ' +
      'its own stack in its own data segment. Before that, start_app stores the kernel\'s ' +
      'stack pointer in the task\'s TSS (esp0 and ss0). Whenever an interrupt or INT 0x40 ' +
      'takes the CPU from level 3 to level 0, the CPU switches to that stack.',
    time: '≈ 141 s',
    state: {
      code: { program: 'day21Segments', focus: ['start', 'enter', 'esp0', 'retf'], current: 'retf' },
      visual: 'none',
      table: null,
      regs: {
        'CS': reg('1F5B', 'App code, requested level 3'),
        'CS base': reg('004CC000', 'The app\'s code'),
        'EIP': reg('00000000', 'The app\'s first instruction'),
        'DS / ES / SS': reg('1F63', 'App data, level 3'),
        'ESP': reg('00010000', 'Top of the app\'s 64 KiB'),
      },
      csip: '1F5B:00000000',
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'The attack fails',
    summary: 'When crack.app loads 0x10 into DS, the CPU refuses and raises exception 0x0D, ' +
      'general protection. The OS prints a message and ends the app.',
    detail: 'The exception goes through IDT entry 0x0D like any interrupt, on the kernel stack ' +
      'from the TSS. inthandler0d reports the problem and returns tss.esp0, the stack ' +
      'start_app saved, and the assembly side switches to it and returns from start_app. The ' +
      'console carries on as if the app had ended normally.',
    time: '≈ 142 s',
    state: {
      tab: 'terminal',
      code: { program: 'day21Exception', focus: ['handler', 'end'], current: null },
      ...show(['>crack', 'INT 0D :', ' General Protected Exception.', '>']),
      regs: {
        'CS': reg('0008', 'Back in the kernel'),
        'CS base': reg('00000000', 'From the GDT entry'),
        'EIP': reg('0000E3··', 'In inthandler0d'),
        'DS / ES / SS': reg('0010', 'Kernel data again'),
        'ESP': reg('····FF??', 'The console task\'s kernel stack (tss.esp0)'),
      },
      csip: '0008:0000E3··',
    },
  },
  {
    id: 'C4',
    phase: 'C',
    title: 'What day 21 did',
    summary: 'Apps get their own data segment and run at level 3. Reaching for the kernel\'s ' +
      'memory now ends the app instead of damaging the OS.',
    detail: 'The CPU checks every segment load and privileged instruction; the OS only sets ' +
      'the levels and handles the exception. The same mechanism lets the OS end an app that ' +
      'misbehaves in other ways. Day 22 writes apps in C and catches more kinds of mistakes.',
    hint: 'Next, day 22: applications in C.',
    milestone: { label: 'Protect', text: 'The OS protects itself' },
    time: '≈ 142 s',
    state: {
      terminal: { lines: GPF_TRACE },
      regs: { 'EIP': IN_CONSOLE },
    },
  },
]);

export const DAY_21 = Object.freeze({
  id: 'day21',
  title: 'Day 21',
  name: 'Protecting the OS',
  phases: PHASES,
  steps: STEPS,
});
