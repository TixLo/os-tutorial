// Day 13: text on a layer in one call, one FIFO of ints for every kind of event, and
// timers kept in a sorted list ending in a sentinel, so a tick looks only at the front.
// The programs are simplified teaching code (see js/data/programs/day13.js).

import { finalState } from '../../core/state.js';
import { DAY_12 } from './day12.js';

const PHASES = Object.freeze({
  A: 'Tidy up',
  B: 'One FIFO for everything',
  C: 'Faster timers',
});

const DAY_12_END = finalState(DAY_12.steps);

const reg = (value, note) => ({ value, note });
const IN_MAIN = reg('0000C3··', 'In kernel_main');

// One FIFO of 128 ints: timer data, then keyboard (256 + code), then mouse (512 + byte)
const MIXED = [1, 256 + 0x1E, 512 + 0x08, 512 + 0x01, 512 + 0x00, 256 + 0x9E, 0, 3];
const fifo32 = (read) => ({
  title: 'fifo: 128 ints for every source',
  size: 128,
  slots: [...MIXED, ...new Array(120).fill(null)].map((value, i) => (i < read ? null : value)),
  write: MIXED.length,
  read,
  note: 'In hex: 1 and 0 blink, 11E key A pressed, 208 201 200 a mouse packet, 19E key A released, 3 the 3-second timer.',
});

const RANGE_TABLE = {
  title: 'Who uses which numbers',
  head: ['Range', 'From', 'Example'],
  rows: [
    { cells: ['0–1', 'Blinking cursor timer', '1 = draw, 0 = erase'] },
    { cells: ['3, 10', 'The 3 s and 10 s timers', '3 → "3[sec]"'] },
    { cells: ['256–511', 'Keyboard: 256 + key code', '256 + 0x1E = 286: A pressed'], focus: true },
    { cells: ['512–767', 'Mouse: 512 + byte', '512 + 0x08 = 520'], focus: true },
  ],
  note: 'An int has room for every source; a single byte did not.',
};

const listTable = (title, timers, note) => ({
  title,
  head: ['Order', 'Timer', 'timeout', 'next →'],
  rows: timers.map(([name, timeout, focus], i) => ({
    cells: [String(i), name, timeout === 0xFFFFFFFF ? '0xFFFFFFFF' : String(timeout), timers[i + 1] ? timers[i + 1][0] : '—'],
    focus,
    dim: name === 'sentinel',
  })),
  note,
});

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 12 stopped',
    summary: 'The OS keeps time and runs timers. The main loop now juggles three FIFOs, and a ' +
      'due timer means scanning all 500 timer slots.',
    detail: 'Today is about doing the same work with less code and less time: a helper for ' +
      'the most repeated three lines, one FIFO instead of three, and a timer list that ' +
      'needs no scanning.',
    time: '≈ 76 s',
    state: {
      ...DAY_12_END,
      regs: { ...DAY_12_END.regs, 'EIP': IN_MAIN },
      tab: 'code',
      visual: 'none',
      table: null,
      timeline: null,
      fifo: null,
      code: { program: 'day12Timers', focus: ['scan'], current: 'handler', trace: true },
      memory: { ...DAY_12_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Text on a layer in one call',
    summary: 'Clearing a background, writing text, and refreshing the rectangle always go ' +
      'together, so they become one function: putstr_on_sheet.',
    detail: 'It takes the layer, the position, the text and background colors, the string, ' +
      'and its length, and does all three steps. Every message on screen from now on uses ' +
      'it, and forgetting the refresh is no longer possible.',
    time: '≈ 76 s',
    state: {
      code: { program: 'day13PutSheet', focus: ['func', 'use'], current: null },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'One FIFO, numbered by source',
    summary: 'Keyboard, mouse, and timers all put into a single FIFO of ints, each in its own ' +
      'range of numbers.',
    detail: 'With three FIFOs the main loop had to check each one, and adding a fourth ' +
      'source would mean a fourth check. Ints have room for everyone: the keyboard adds ' +
      '256 to its code and the mouse adds 512 to its byte, so nothing overlaps. The order ' +
      'of events across sources is kept, too.',
    time: '≈ 77 s',
    state: {
      code: { program: 'day13Fifo32', focus: ['struct', 'ranges'], current: 'loop' },
      visual: 'table',
      table: RANGE_TABLE,
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Sort by number',
    summary: 'The main loop takes one int at a time and decides what it is by its range.',
    detail: 'Here eight events arrived in a burst: the blink timer, the A key, a mouse ' +
      'packet, the A key\'s release, the blink again, and the 3-second timer. The loop has ' +
      'handled the first five; three are waiting.',
    time: '≈ 79 s',
    state: {
      code: { focus: ['loop', 'dispatch'], current: 'dispatch' },
      visual: 'fifo',
      fifo: fifo32(5),
      regs: { 'EAX': reg('00000200', 'i = 0x200 = 512 + 0: the packet\'s last byte') },
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'Keep the timers in order',
    summary: 'Running timers are linked into a list sorted by timeout. The interrupt handler ' +
      'only ever looks at the front.',
    detail: 'timer_settime walks the list to the right place and links the new timer in, with ' +
      'interrupts off so the handler never sees a half-linked list. The handler takes ' +
      'timers off the front while they are due and stops at the first that isn\'t. Setting ' +
      'a timer costs a short walk; a tick costs one comparison, however many timers run.',
    time: '≈ 79 s',
    state: {
      code: { program: 'day13TimerList', focus: ['struct', 'insert', 'head', 'walk', 'pop'], current: null },
      visual: 'table',
      table: listTable('Running timers at count 7,900', [
        ['timer3 (blink)', 7950, true], ['timer2 (3 s)', 8200, false], ['timer1 (10 s)', 8900, false], ['sentinel', 0xFFFFFFFF, false],
      ], 'timerctl.t0 → timer3; timerctl.next = 7950.'),
      regs: { 'EAX': reg('????????', 'Used by earlier code') },
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'A timer that never goes off',
    summary: 'A sentinel timer with timeout 0xFFFFFFFF sits at the end of the list forever, so ' +
      'the list is never empty.',
    detail: 'Without it, inserting and removing need extra cases: "the list is empty", "the ' +
      'new timer goes last". With the sentinel, the walk in timer_settime always stops at ' +
      'some timer, and the handler\'s loop always ends, because no count reaches ' +
      '0xFFFFFFFF in practice. Fewer cases mean fewer chances for bugs.',
    time: '≈ 79 s',
    state: {
      code: { focus: ['sentinel', 'walk'], current: null },
      table: listTable('Inserting a 1-second timer at count 7,900', [
        ['timer3 (blink)', 7950, false], ['new (1 s)', 8000, true], ['timer2 (3 s)', 8200, false], ['timer1 (10 s)', 8900, false], ['sentinel', 0xFFFFFFFF, false],
      ], 'The walk stopped at timer2: 8000 ≤ 8200. It always stops by the sentinel at the latest.'),
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'When the count runs out',
    summary: 'count is 32 bits and grows by 100 a second, so it would wrap around to 0 after ' +
      'about 497 days.',
    detail: 'After a wrap, every timer would look overdue, or never due. Long before that, the ' +
      'OS can subtract the current count from count and from every running timer\'s ' +
      'timeout, at a quiet moment with interrupts off: the order and the distances stay ' +
      'the same, and the numbers start small again.',
    formula: '2³² / 100 ticks per second / 86,400 seconds per day ≈ 497 days',
    time: '≈ 79 s',
    state: {
      code: { focus: ['struct'], current: null },
    },
  },
  {
    id: 'C4',
    phase: 'C',
    title: 'What day 13 did',
    summary: 'One FIFO carries every event in order, and timers cost one comparison per tick ' +
      'however many there are.',
    detail: 'putstr_on_sheet trims the drawing code, a FIFO of ints with number ranges replaces ' +
      'separate byte FIFOs, and the timer list is sorted, linked, and closed by a sentinel. ' +
      'Day 14 turns to the screen again: a higher resolution, and typing into a window.',
    hint: 'Next, day 14: high resolution and keyboard input.',
    milestone: { label: 'Events', text: 'One event queue, fast timers' },
    time: '≈ 79 s',
    state: {
      visual: 'fifo',
      fifo: fifo32(8),
      table: null,
      code: { program: 'day13Fifo32', focus: ['loop'], current: 'loop' },
    },
  },
]);

export const DAY_13 = Object.freeze({
  id: 'day13',
  title: 'Day 13',
  name: 'Faster timers, one FIFO',
  phases: PHASES,
  steps: STEPS,
});
