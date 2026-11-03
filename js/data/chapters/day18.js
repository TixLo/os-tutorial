// Day 18: the console keeps the typed line and understands its first commands: mem,
// cls, and dir, which lists the files in the FAT12 root directory of the floppy image
// already in memory.
// The programs are simplified teaching code (see js/data/programs/day18.js).

import { finalState } from '../../core/state.js';
import { osScreen, consoleTerminal } from './desktop640.js';
import { ROOT_ADDR, filesOnDay, dirEntry, rootDirWrite, dirLines } from '../floppy.js';
import { DAY_17 } from './day17.js';

const PHASES = Object.freeze({
  A: 'Read the command',
  B: 'mem and cls',
  C: 'dir',
});

const DAY_17_END = finalState(DAY_17.steps);

const reg = (value, note) => ({ value, note });
const hex2 = (value) => value.toString(16).toUpperCase().padStart(2, '0');
const IN_CONSOLE = reg('0000E1··', 'In console_task');

const show = (lines, extra = {}) => ({
  graphics: osScreen({ lines, ...extra }),
  terminal: consoleTerminal(lines.slice(-8)),
});

const MEM_LINES = ['>mem', 'total   32MB', 'free 27984KB', '>'];
const DIR = dirLines(18);
const DIR_LINES = ['>dir', ...DIR, '>'];

const kernelEntry = dirEntry(filesOnDay(18)[0]);
const ENTRY_TABLE = {
  title: 'Root directory entry 0 at 0x0A600',
  head: ['Bytes', 'Field', 'Value'],
  rows: [
    { cells: ['0–7', 'name', `${kernelEntry.slice(0, 8).map(hex2).join(' ')} "KERNEL  "`], focus: true },
    { cells: ['8–10', 'ext', `${kernelEntry.slice(8, 11).map(hex2).join(' ')} "SYS"`], focus: true },
    { cells: ['11', 'type', '20: an ordinary file'] },
    { cells: ['12–21', 'reserve', '00 …'], dim: true },
    { cells: ['22–25', 'time, date', 'when it was written'], dim: true },
    { cells: ['26–27', 'clustno', '02 00: cluster 2'], focus: true },
    { cells: ['28–31', 'size', `${kernelEntry.slice(28, 32).map(hex2).join(' ')} = 15,672 bytes`], focus: true },
  ],
  note: 'name[0] = 00: no more entries · E5: deleted · type & 18: folder or disk label.',
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 17 stopped',
    summary: 'The console takes typing and starts new lines, but a line is only pixels: the ' +
      'console doesn\'t remember what was typed.',
    detail: 'To run a command, the console needs the line as text. From today it keeps every ' +
      'character it draws in cmdline as well, and Enter compares cmdline with the commands ' +
      'it knows.',
    time: '≈ 125 s',
    state: {
      ...DAY_17_END,
      ...show(['>']),
      tab: 'code',
      visual: 'none',
      table: null,
      code: { program: 'day17Console', focus: ['enter'], current: 'loop', trace: true },
      regs: { ...DAY_17_END.regs, 'EIP': IN_CONSOLE },
      memory: { ...DAY_17_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Keep the line as text',
    summary: 'Each character typed also goes into cmdline. On Enter, a 0 ends the string, and ' +
      'strcmp checks it against each command name.',
    detail: 'cursor_x tells where the line ends: the prompt takes the first 16 pixels and each ' +
      'character 8, so the length is cursor_x / 8 − 2. Unknown words get "Bad command."; an ' +
      'empty line just gets a new prompt.',
    time: '≈ 126 s',
    state: {
      ...show(['>hello', 'Bad command.', '>']),
      tab: 'terminal',
      code: { program: 'day18Commands', focus: ['cmdline', 'enter', 'bad'], current: null },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'mem',
    summary: 'mem prints the total memory found on day 9 and how much the memory manager still ' +
      'has free.',
    detail: 'The numbers come from memtotal and memman_total, which adds up the sizes in the ' +
      'free list. Since day 9 the layers, the map, the task stacks, and the console have ' +
      'taken their share.',
    time: '≈ 128 s',
    state: {
      ...show(MEM_LINES),
      code: { focus: ['mem'], current: null },
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'cls',
    summary: 'cls fills the text area with black and puts the prompt back at the top.',
    detail: 'It is the same boxfill and sheet_refresh as everywhere else, on the console\'s ' +
      'own layer. Nothing is kept from before, because the console has no history.',
    time: '≈ 130 s',
    state: {
      ...show(['>']),
      code: { focus: ['cls'], current: null },
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'Where the file list is',
    summary: 'A FAT12 floppy keeps its file list, the root directory, in sectors 20 to 33. The ' +
      'IPL copied that part of the disk on day 3, so it is in memory at {0xA600}.',
    detail: 'Disk byte n is at {0x8000} + n, and the root directory starts at disk byte ' +
      '0x2600. No disk access is needed: dir reads memory. The directory has room for 224 ' +
      'entries of 32 bytes each.',
    formula: 'sector 20 → disk byte (20 − 1) × 512 = 0x2600 → memory 0x8000 + 0x2600 = 0xA600',
    time: '≈ 130 s',
    state: {
      tab: 'memory',
      visual: 'disk',
      disk: { focus: 'root', note: ['Root directory: sectors 20–33', '→ in memory at 0xA600'] },
      writes: { rootDir: rootDirWrite(18) },
      memory: { focus: { id: 'free_high', note: 'The root directory, from the disk image', bytes: [ROOT_ADDR, ROOT_ADDR + 0x5F] } },
      code: { focus: ['struct', 'dir'], current: null },
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'One entry, 32 bytes',
    summary: 'Each entry holds an 8-letter name and 3-letter extension padded with spaces, ' +
      'attributes, the first cluster, and the size.',
    detail: 'The first entry is the kernel itself: KERNEL.SYS, starting at cluster 2, which ' +
      'is disk byte 0x4200, memory 0xC200: exactly where the IPL jumped on day 3. dir skips ' +
      'entries whose first byte is E5 (deleted) and those whose type marks a folder or the ' +
      'disk\'s name, and stops at the first entry that starts with 00.',
    time: '≈ 130 s',
    state: {
      tab: 'code',
      visual: 'table',
      table: ENTRY_TABLE,
      code: { focus: ['struct', 'skip'], current: null },
      memory: { focus: { id: 'free_high', note: 'Entry 0: KERNEL.SYS', bytes: [ROOT_ADDR, ROOT_ADDR + 0x1F] } },
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'dir',
    summary: 'dir prints each file\'s name, extension, and size. Today\'s disk has three files.',
    detail: 'The name and extension are copied straight from the entry, spaces and all, which ' +
      'lines the columns up for free. Day 19 uses the cluster number in the entry to read a ' +
      'file\'s contents.',
    time: '≈ 132 s',
    state: {
      tab: 'terminal',
      ...show(DIR_LINES),
      visual: 'disk',
      disk: { focus: 'root', note: null },
      code: { focus: ['dir', 'print'], current: null },
    },
  },
  {
    id: 'C4',
    phase: 'C',
    title: 'What day 18 did',
    summary: 'The console understands commands: mem, cls, and dir, which reads the floppy\'s ' +
      'root directory from memory.',
    detail: 'Commands are compared as strings and each has a few lines of code. The file ' +
      'list was already in memory thanks to the IPL. Next, the console reads what is inside ' +
      'a file, and runs the first program that isn\'t part of the OS.',
    hint: 'Next, day 19: reading files and running an application.',
    milestone: { label: 'dir', text: 'The first commands' },
    time: '≈ 132 s',
    state: {
      visual: 'none',
      table: null,
    },
  },
]);

export const DAY_18 = Object.freeze({
  id: 'day18',
  title: 'Day 18',
  name: 'Commands and files',
  phases: PHASES,
  steps: STEPS,
});
