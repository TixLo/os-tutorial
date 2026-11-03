// Day 19: the type command finds a file and prints it, the FAT says where each file
// continues, and the console loads a program from the disk and jumps into it.
// The programs are simplified teaching code (see js/data/programs/day19.js).

import { finalState } from '../../core/state.js';
import { osScreen, consoleTerminal } from './desktop640.js';
import {
  FAT_ADDR, HELLO_TEXT, filesOnDay, clusterAddr, rootDirWrite, fatWrite, fatEntries,
  fileWrite, textBytes, dirLines,
} from '../floppy.js';
import { DAY_18 } from './day18.js';

const PHASES = Object.freeze({
  A: 'type',
  B: 'The FAT',
  C: 'Run a program',
});

const DAY_18_END = finalState(DAY_18.steps);

const reg = (value, note) => ({ value, note });
const hex = (value, width = 5) => '0x' + value.toString(16).toUpperCase().padStart(width, '0');
const hex2 = (value) => value.toString(16).toUpperCase().padStart(2, '0');
const IN_CONSOLE = reg('0000E1··', 'In console_task');

const FILES = filesOnDay(19);
const HELLO_TXT = FILES.find((f) => f.name === 'HELLO' && f.ext === 'TXT');
const HLT_APP = FILES.find((f) => f.name === 'HLT');
const KERNEL = FILES[0];
const HLT_BYTES = [0xF4, 0xEB, 0xFD];

const show = (lines, extra = {}) => ({
  graphics: osScreen({ lines, ...extra }),
  terminal: consoleTerminal(lines.slice(-8)),
});

const TYPE_LINES = ['>type hello.txt', HELLO_TEXT.trimEnd(), '>'];

const fat = fatEntries(19);
const FAT_TABLE = {
  title: 'The first FAT bytes, unpacked',
  head: ['Bytes', 'Entries', 'Meaning'],
  rows: [
    { cells: ['F0 FF FF', 'FAT[0] = FF0, FAT[1] = FFF', 'Reserved: media type and an end mark'], dim: true },
    { cells: ['03 40 00', `FAT[2] = ${hex2(fat[2]).padStart(3, '0')}, FAT[3] = ${hex2(fat[3]).padStart(3, '0')}`, 'KERNEL.SYS: 2 → 3 → 4'], focus: true },
    { cells: ['05 60 00', 'FAT[4] = 005, FAT[5] = 006', '… → 5 → 6 → …'] },
    { cells: ['…', 'FAT[32] = FFF', 'KERNEL.SYS ends at cluster 32'] },
    { cells: ['…', 'FAT[37] = FFF', 'HELLO.TXT is one cluster'] },
  ],
  note: 'Entry 2n is the low 12 bits of 3 bytes; entry 2n + 1 the high 12 bits.',
};

const CHAIN_TABLE = {
  title: 'Following KERNEL.SYS through the FAT',
  head: ['Cluster', 'Disk byte', 'Memory', 'FAT says next'],
  rows: [2, 3, 4, 31, 32].map((c) => ({
    cells: [String(c), hex(0x3E00 + c * 512), hex(clusterAddr(c)), fat[c] === 0xFFF ? 'FFF: end' : String(fat[c])],
    focus: c === 2 || c === 32,
  })),
  note: '31 clusters × 512 bytes hold its 15,672 bytes. A file written in pieces would jump around.',
};

const LAYOUT = [
  ...DAY_18_END.memory.layout,
  { id: 'app_hlt', start: 0x4CC000, end: 0x4CCFFF, name: 'hlt.app, loaded (code segment 1003)', kind: 'ram' },
];

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 18 stopped',
    summary: 'The console can list the files on the disk. Next: read what is inside one, and ' +
      'then run one as a program.',
    detail: 'dir only needed the root directory. Reading a file also needs to know where its ' +
      'data is, which the entry\'s cluster number and the FAT tell. Running a file needs a ' +
      'place in memory and a segment for it.',
    time: '≈ 132 s',
    state: {
      ...DAY_18_END,
      ...show(['>dir', ...dirLines(19), '>']),
      tab: 'terminal',
      visual: 'none',
      table: null,
      disk: { focus: null, note: null },
      code: { program: 'day18Commands', focus: ['dir'], current: null, trace: true },
      writes: { ...DAY_18_END.writes, rootDir: rootDirWrite(19), fat: fatWrite(19), hello: fileWrite(HELLO_TXT, textBytes(HELLO_TEXT)), hltApp: fileWrite(HLT_APP, HLT_BYTES) },
      regs: { ...DAY_18_END.regs, 'EIP': IN_CONSOLE },
      memory: { ...DAY_18_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Find the file',
    summary: '"type hello.txt" turns the name into the directory\'s form, "HELLO   TXT", and ' +
      'compares it with each entry.',
    detail: 'Names in the directory are capitals, 8 letters and 3, padded with spaces, with no ' +
      'dot. So the console upper-cases what was typed and lays it out the same way. ' +
      'file_search compares all 11 bytes of each entry and returns the one that matches.',
    formula: '"hello.txt" → H E L L O _ _ _ T X T',
    time: '≈ 134 s',
    state: {
      tab: 'code',
      code: { program: 'day19Type', focus: ['cmd', 'name', 'search'], current: 'load' },
      ...show(['>type hello.txt']),
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Print it',
    summary: 'The entry says cluster 37, which is disk byte 0x8600, in memory at ' +
      `{${hex(clusterAddr(HELLO_TXT.cluster))}}. The console prints its ${HELLO_TXT.size} bytes as text.`,
    detail: 'Byte 0x0A starts a new line, 0x0D is skipped (Windows ends lines with both), and ' +
      'a tab moves to the next multiple of 4 columns. Every other byte is drawn with the font. ' +
      'A binary file would come out as a jumble of symbols, which is what type does with ' +
      'one.',
    formula: 'cluster c → disk 0x3E00 + c × 512 → memory 0x8000 + 0x3E00 + c × 512',
    time: '≈ 134 s',
    state: {
      tab: 'memory',
      ...show(TYPE_LINES),
      code: { focus: ['load', 'print'], current: null },
      memory: { focus: { id: 'disk_image', note: 'HELLO.TXT in the disk image', bytes: [clusterAddr(HELLO_TXT.cluster), clusterAddr(HELLO_TXT.cluster) + 0x2F] } },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'The FAT',
    summary: 'A file bigger than one cluster can be scattered over the disk. The FAT, at ' +
      '{0x8200}, gives for each cluster the number of the next one.',
    detail: 'FAT12 entries are 12 bits, so two fit in three bytes. file_readfat unpacks all ' +
      '2,880 into an array of ints once, at startup, so following a file later is just ' +
      'array lookups. 0xFFF marks the last cluster of a file.',
    time: '≈ 134 s',
    state: {
      tab: 'code',
      code: { program: 'day19Fat', focus: ['read', 'unpack'], current: 'load' },
      visual: 'table',
      table: FAT_TABLE,
      memory: { focus: { id: 'disk_image', note: 'The FAT, from the disk image', bytes: [FAT_ADDR, FAT_ADDR + 0x1F] } },
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Follow the chain',
    summary: 'file_loadfile copies a file cluster by cluster, looking up the next cluster in ' +
      'the FAT each time, until the size runs out.',
    detail: 'On a fresh disk every file is in one piece, as here, but after files are deleted ' +
      'and written a new file fills whatever gaps there are. type and every later file ' +
      'command use file_loadfile, so they work either way.',
    time: '≈ 134 s',
    state: {
      code: { focus: ['load', 'chain'], current: null },
      table: CHAIN_TABLE,
      visual: 'table',
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'A program on the disk',
    summary: 'hlt.app is three bytes: hlt, then a jump back to it. The console loads it into ' +
      'memory from the memory manager.',
    detail: 'It is written in assembly and assembled to a file of its own, apart from the ' +
      'kernel. The OS can\'t know in advance where it will be loaded, so it gives the program ' +
      'a code segment whose base is wherever the bytes ended up: to the program, its first ' +
      'byte is always address 0.',
    formula: 'F4 = hlt · EB FD = jmp back 3 bytes',
    time: '≈ 136 s',
    state: {
      tab: 'memory',
      visual: 'none',
      table: null,
      code: { program: 'day19Run', focus: ['cmd', 'load', 'segment', 'app'], current: 'jump' },
      ...show(['>hlt']),
      memory: { layout: LAYOUT, focus: { id: 'app_hlt', note: 'hlt.app, 3 bytes', bytes: [0x4CC000, 0x4CC00F] } },
      writes: { hltLoaded: { start: 0x4CC000, end: 0x4CC002, data: [[0x4CC000, HLT_BYTES]] } },
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'Jump into it',
    summary: 'GDT entry 1003 describes the program as a code segment. A far jump to 1003 × 8 ' +
      'starts it, and the console task now runs hlt.app.',
    detail: 'The program sleeps in hlt and jumps back, forever. The console is stuck: its ' +
      'task is busy inside the program and there is no way back yet. Everything else still ' +
      'works, because the timer keeps switching to the other tasks. Day 20 gives programs a ' +
      'way to return and to ask the OS for help.',
    formula: 'selector 1003 × 8 = 0x1F58 → base 0x4CC000, limit 2',
    time: '≈ 136 s',
    state: {
      tab: 'code',
      code: { focus: ['jump', 'app'], current: 'app' },
      regs: {
        'CS': reg('1F58', 'GDT entry 1003: hlt.app\'s code segment'),
        'CS base': reg('004CC000', 'Where hlt.app was loaded'),
        'EIP': reg('00000000', 'Offset 0: hlt'),
      },
      csip: '1F58:00000000',
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'What day 19 did',
    summary: 'The console reads files through the FAT and runs a program loaded from the disk ' +
      'in a code segment of its own.',
    detail: 'The program is not part of the kernel: it was built separately and loaded at ' +
      'run time, which is what makes it an application. It can\'t do anything useful yet, ' +
      'not even print, and it never ends. Day 20 adds both.',
    hint: 'Next, day 20: system calls.',
    milestone: { label: 'App', text: 'The first application' },
    time: '≈ 136 s',
    state: {
      tab: 'memory',
      memory: { focus: { id: 'app_hlt', note: 'hlt.app, running' } },
    },
  },
]);

export const DAY_19 = Object.freeze({
  id: 'day19',
  title: 'Day 19',
  name: 'Files and the first app',
  phases: PHASES,
  steps: STEPS,
});
