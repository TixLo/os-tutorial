// Day 9: the kernel measures how much memory the machine has, and a memory manager keeps
// a list of free ranges to hand out and take back.
// The programs are simplified teaching code (see js/data/programs/day09.js).

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { DAY_08 } from './day08.js';

const PHASES = Object.freeze({
  A: 'Count the memory',
  B: 'Hand out memory',
});

const DAY_8_END = finalState(DAY_08.steps);

const reg = (value, note) => ({ value, note });
const hex = (value, width = 8) => '0x' + value.toString(16).toUpperCase().padStart(width, '0');
const IN_MAIN = reg('0000C3··', 'In kernel_main');

const MIB = 0x100000;
const MEMTOTAL = 32 * MIB;
const FREE_START = 0x400000;

// Regions the OS knows about after today
const BASE_LAYOUT = DAY_8_END.memory.layout;
const MEMMAN_REGION = { id: 'os_memman', start: 0x3C0000, end: 0x3C7FFF, name: 'Memory manager\'s table', kind: 'ram' };
const FREE_REGION = { id: 'os_free', start: FREE_START, end: MEMTOTAL - 1, name: 'Memory for the OS to hand out', kind: 'ram' };
const TESTED_LAYOUT = [...BASE_LAYOUT, FREE_REGION];
const MANAGED_LAYOUT = [...BASE_LAYOUT, MEMMAN_REGION, FREE_REGION];

const MEMORY_LINE = `memory ${MEMTOTAL / MIB}MB  free ${(MEMTOTAL - FREE_START) / 1024}KB`;
const withMemoryLine = (ops) => ({
  ...DAY_8_END.graphics,
  ops: [
    ...ops,
    { op: 'box', color: C.black, x0: 8, y0: 144, x1: 8 + MEMORY_LINE.length * 8 - 1, y1: 159 },
    { op: 'text', x: 8, y: 144, color: C.white, text: MEMORY_LINE },
  ],
});
const SCREEN = withMemoryLine(DAY_8_END.graphics.ops);

// Free list tables: [addr, size] pairs
const freeTable = (title, entries, focus = [], note) => ({
  title,
  head: ['Entry', 'Address', 'Size', 'Ends at'],
  rows: entries.map(([addr, size], i) => ({
    cells: [String(i), hex(addr), `${size / 1024} KiB`, hex(addr + size - 1)],
    focus: focus.includes(i),
  })),
  note,
});

// Blocks handed out, shown in memory as written
const block = (start, size) => ({ start, end: start + size - 1, state: 'written' });

const MEMTEST_LOG = [
  '> trace memtest_sub 0x00400000 0xBFFFFFFF',
  'page 0x00400000: wrote AA55AA55, flipped, read 55AA55AA  ok',
  'page 0x00401000: ok',
  '...',
  'page 0x01FFF000: ok',
  'page 0x02000000: wrote AA55AA55, flipped, read FFFFFFFF  FAIL',
  'nothing answers at 0x02000000: memory ends here',
  'memtotal = 0x02000000 (32 MiB)',
];

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 8 stopped',
    summary: 'Keyboard and mouse work. To keep windows and their contents in memory, the OS ' +
      'next has to manage memory, and first it has to know how much there is.',
    detail: 'In real mode the kernel could have asked the BIOS. In protected mode the BIOS is ' +
      'out of reach, so the kernel finds out itself: it writes to memory and checks whether ' +
      'the value comes back. Where nothing answers, memory has ended.',
    time: '≈ 18 s',
    state: {
      ...DAY_8_END,
      regs: { ...DAY_8_END.regs, 'EIP': IN_MAIN },
      tab: 'code',
      visual: 'none',
      table: null,
      fifo: null,
      terminal: null,
      code: { program: 'day8Move', focus: null, current: 'loop', trace: true },
      memory: { ...DAY_8_END.memory, focus: { id: 'extended', note: 'Memory above 1 MiB: how far does it go?' } },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Switch the cache off',
    summary: 'A 486 or later keeps copies of recently used memory in a fast cache, which would ' +
      'answer the test without ever touching memory.',
    detail: 'Writing a value and reading it straight back would always succeed, even where ' +
      'there is no RAM, because the cache keeps the value. So memtest first checks for a 486 ' +
      'by trying to set bit 18 of EFLAGS (AC), which a 386 can\'t, and if so sets the CD ' +
      'and NW bits of CR0 to switch the cache off for the duration of the test.',
    formula: 'EFLAGS bit 18 (AC) sticks → 486 or later\nCR0 | 0x60000000 → cache off',
    time: '≈ 18 s',
    state: {
      code: { program: 'day9Memtest', focus: ['consts', 'detect', 'cache'], current: 'call' },
      regs: {
        'EIP': reg('0000CA··', 'In memtest'),
        'EFLAGS': reg('00040202', 'AC was set and stayed: a 486 or later'),
        'CR0': reg('60000011', 'CD = NW = 1: cache off for the test'),
      },
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'The compiler deletes the test',
    summary: 'Written in C, the test writes a pattern, flips it, and compares. The compiler ' +
      'proves the comparison can never fail and removes it.',
    detail: 'To an optimizing compiler, memory is just memory: if it stored 0xAA55AA55 and ' +
      'flipped every bit, the value must be 0x55AA55AA, so the check and the loop around it ' +
      'are pointless and vanish. The result would claim every address up to 3 GiB is RAM. ' +
      'Writing the loop in assembly guarantees every read and write really happens.',
    formula: '0xAA55AA55 ^ 0xFFFFFFFF = 0x55AA55AA, "always"',
    time: '≈ 18 s',
    state: {
      code: { program: 'day9MemtestSub', focus: ['cloop', 'cwrite', 'ccheck'], current: 'asm' },
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'Test every 4 KiB',
    summary: 'memtest_sub checks the last 4 bytes of each 4 KiB page from 4 MiB up, and stops ' +
      'at the first page that doesn\'t answer.',
    detail: 'Testing every byte would take far too long, and memory comes in large pieces, so ' +
      'one spot per page is enough. Each spot\'s old value is put back. On this machine ' +
      'every page up to 0x1FFF000 passes, and at 0x2000000, 32 MiB, the read returns ' +
      'FFFFFFFF: no RAM there.',
    time: '≈ 18.1 s',
    state: {
      tab: 'terminal',
      code: { focus: ['asm', 'aloop', 'fin'], current: 'fin' },
      regs: {
        'EIP': reg('0000CB··', 'In memtest_sub'),
        'EAX': reg('02000000', 'The first address that failed'),
        'ESI': reg('AA55AA55', 'pat0'),
        'EDI': reg('55AA55AA', 'pat1'),
      },
      terminal: { lines: MEMTEST_LOG },
      memory: { layout: TESTED_LAYOUT, focus: { id: 'os_free', note: 'RAM found from 4 MiB up to 32 MiB' } },
    },
  },
  {
    id: 'A4',
    phase: 'A',
    title: '32 MiB',
    summary: 'memtest returns 0x2000000: the machine has 32 MiB of memory, the size the book\'s ' +
      'emulator gives it.',
    detail: 'The cache is switched back on, CR0 and EFLAGS are restored, and the kernel prints ' +
      'the result. The first 4 MiB hold the kernel, the disk image, video memory, and the ' +
      'OS\'s tables, so the memory the OS can hand out starts at {0x400000}.',
    formula: '0x2000000 = 33,554,432 bytes = 32 MiB\nfree: 32 MiB − 4 MiB = 28 MiB = 28,672 KiB',
    time: '≈ 18.1 s',
    state: {
      tab: 'memory',
      graphics: SCREEN,
      code: { program: 'day9Memtest', focus: ['cache', 'func'], current: 'func' },
      regs: {
        'EIP': IN_MAIN,
        'EAX': reg('02000000', 'memtotal'),
        'ESI': null,
        'EDI': null,
        'EFLAGS': reg('00000202', 'AC cleared again'),
        'CR0': reg('00000011', 'Cache back on'),
      },
      terminal: null,
      memory: { focus: { id: 'vram', note: 'The result, printed at (8, 144)' } },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'A list of free ranges',
    summary: 'The memory manager keeps a table of free ranges, each an address and a size. At ' +
      'the start there is one: 28 MiB from 0x400000.',
    detail: 'The table lives at {0x3C0000}, sorted by address, with room for 4,000 ranges. ' +
      'Describing free memory as ranges keeps the table small however much memory there ' +
      'is. Freeing all of 4 MiB–32 MiB at startup is how the manager learns what it owns.',
    time: '≈ 18.1 s',
    state: {
      tab: 'code',
      code: { program: 'day9Memman', focus: ['struct', 'main'], current: 'alloc' },
      visual: 'table',
      table: freeTable('Free list at 0x3C0000', [[FREE_START, MEMTOTAL - FREE_START]], [0]),
      memory: { layout: MANAGED_LAYOUT, focus: { id: 'os_memman', note: 'The free list' } },
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Allocate',
    summary: 'memman_alloc takes the first range that is big enough, hands out its start, and ' +
      'shrinks it. Two requests, 64 KiB and then 4 KiB, get 0x400000 and 0x410000.',
    detail: 'Taking the first fit is simple and fast. The free range now starts after both ' +
      'blocks. Nothing records who owns a block: whoever asked must remember its address ' +
      'and size and give them back when done.',
    formula: '0x400000 + 0x10000 (64 KiB) = 0x410000\n0x410000 + 0x1000 (4 KiB) = 0x411000',
    time: '≈ 18.1 s',
    state: {
      code: { focus: ['alloc', 'take'], current: 'free' },
      table: freeTable('Free list after two allocations', [[0x411000, MEMTOTAL - 0x411000]], [0],
        'Handed out: 0x400000 (64 KiB) and 0x410000 (4 KiB).'),
      ranges: { a: block(0x400000, 0x10000), b: block(0x410000, 0x1000) },
      regs: { 'EAX': reg('00410000', 'The second block\'s address') },
      memory: { focus: { id: 'os_free', note: 'Two blocks handed out', range: [0x400000, 0x410FFF] } },
    },
  },
  {
    id: 'B3',
    phase: 'B',
    title: 'Free, and merge',
    summary: 'Giving back the 64 KiB block adds a second range. Giving back the 4 KiB block ' +
      'fills the gap between them, and the three ranges merge into one.',
    detail: 'memman_free finds where the block fits in the sorted list and checks its ' +
      'neighbors: if it touches the range before it, after it, or both, they are joined. ' +
      'Without merging, memory would end up cut into small pieces that are all too short ' +
      'for a big request.',
    formula: '0x400000 + 64 KiB = 0x410000 · 0x410000 + 4 KiB = 0x411000 → one range again',
    time: '≈ 18.1 s',
    state: {
      code: { focus: ['free', 'merge', 'insert'], current: null },
      table: freeTable('Free list: after freeing 64 KiB, then 4 KiB',
        [[FREE_START, 0x10000], [0x411000, MEMTOTAL - 0x411000]], [0],
        'Freeing the 4 KiB at 0x410000 next joins both: one range, 0x400000, 28 MiB.'),
      ranges: { a: null, b: block(0x410000, 0x1000) },
      memory: { focus: { id: 'os_free', note: 'One block still handed out', range: [0x410000, 0x410FFF] } },
    },
  },
  {
    id: 'B4',
    phase: 'B',
    title: 'What day 9 did',
    summary: 'The kernel knows it has 32 MiB and can hand out and take back memory from 4 MiB ' +
      'up.',
    detail: 'Measuring needed the cache off and assembly the compiler couldn\'t "improve". ' +
      'The manager is a sorted list of free ranges with first-fit allocation and merging on ' +
      'free. Day 10 rounds requests up to 4 KiB, so the list stays tidy, and uses it to ' +
      'give the screen layers.',
    hint: 'Next, day 10: layers for the background and the mouse.',
    milestone: { label: 'Memory', text: 'Memory measured and managed' },
    time: '≈ 18.1 s',
    state: {
      tab: 'memory',
      visual: 'table',
      table: freeTable('Free list at 0x3C0000', [[FREE_START, MEMTOTAL - FREE_START]], [0]),
      ranges: { a: null, b: null },
      regs: { 'EAX': reg('????????', 'Used by earlier code') },
      memory: { focus: { id: 'os_free', note: 'All 28 MiB free again' } },
    },
  },
]);

export const DAY_09 = Object.freeze({
  id: 'day9',
  title: 'Day 9',
  name: 'Memory management',
  phases: PHASES,
  steps: STEPS,
});
