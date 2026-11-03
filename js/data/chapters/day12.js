// Day 12: the timer chip interrupts 100 times a second, the kernel keeps time, and timers
// let any part of the OS ask to be told when a moment comes.
// The programs are simplified teaching code (see js/data/programs/day12.js).
//
// From day 12, a step can set `timeline` for the timeline diagram (visual: 'timeline'):
//   { title, start, end, unit, lanes: [{ name, marks, spans }], now, note }

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { screen320, windowOps, textOn } from '../screens.js';
import { cursorAt } from './day05.js';
import { background } from './day10.js';
import { DAY_11 } from './day11.js';

const PHASES = Object.freeze({
  A: 'The timer chip',
  B: 'Timeouts',
});

const DAY_11_END = finalState(DAY_11.steps);

const reg = (value, note) => ({ value, note });
const IN_MAIN = reg('0000C3··', 'In kernel_main');
const PIC = (active = null) => ({ imr: [0xF8, 0xEF], base: [0x20, 0x28], active, note: null });

// The window from day 11, now showing the time, and a line for timer messages
const WIN_X = 140;
const WIN_Y = 40;
const MOUSE = [186, 150];
// The window's own pixels, drawn at (ox, oy): (0, 0) for its buffer, its position for
// the screen
function windowContent(ox, oy, { count, message = '', blink = false }) {
  const lines = [[40, 28, String(count).padStart(10, '0')]];
  if (message) lines.push([8, 44, message]);
  const ops = [
    ...windowOps(ox, oy, 160, 68, 'timer'),
    ...lines.flatMap(([x, y, text]) => textOn(ox + x, oy + y, text)),
  ];
  if (blink) {
    const x = ox + 8 + message.length * 8;
    ops.push({ op: 'box', color: C.black, x0: x, y0: oy + 44, x1: x + 7, y1: oy + 59 });
  }
  return ops;
}
const screen = (content) => screen320([...background(...MOUSE), ...windowContent(WIN_X, WIN_Y, content), cursorAt(...MOUSE)]);
const WIN_BUF = DAY_11_END.memory.layout.find((region) => region.id === 'os_winbuf').start;
const winBuf = (content) => ({
  start: WIN_BUF, end: WIN_BUF + 160 * 68 - 1,
  graphics: { width: 160, height: 68, ops: windowContent(0, 0, content) },
});

const ticks = (from, to, step) => {
  const marks = [];
  for (let t = from; t <= to; t += step) marks.push({ at: t });
  return marks;
};

const PIT_LOG = [
  '> watch ports 0x40 0x43',
  'out 0x43 <- 34    counter 0: low byte, high byte, rate generator',
  'out 0x40 <- 9C    start value, low byte',
  'out 0x40 <- 2E    start value, high byte: 0x2E9C = 11,932',
];

const TIMER_TABLE = (count, rows, next) => ({
  title: `Timers at count ${count}`,
  head: ['Timer', 'timeout', 'Due in', 'Data', 'State'],
  rows: rows.map(([name, timeout, data, state, focus]) => ({
    cells: [name, String(timeout), state === 'running' ? `${((timeout - count) / 100).toFixed(2)} s` : '—', String(data), state],
    focus,
    dim: state !== 'running',
  })),
  note: `timerctl.next = ${next}: until then, each tick only compares two numbers.`,
});

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 11 stopped',
    summary: 'The counter in the window shows how fast the CPU runs, but nothing in the OS ' +
      'knows how much time has passed.',
    detail: 'Counting loop passes says nothing about seconds: a faster CPU counts faster. To ' +
      'blink a cursor, wait a moment, or later share the CPU between programs, the OS needs ' +
      'a clock that ticks at a known rate. Every PC has one: the programmable interval ' +
      'timer (PIT), wired to IRQ 0.',
    time: '≈ 24 s',
    state: {
      ...DAY_11_END,
      regs: { ...DAY_11_END.regs, 'EIP': IN_MAIN, 'EAX': reg('????????', 'Used by earlier code'), 'ECX': reg('????????', 'Used by earlier code') },
      tab: 'code',
      visual: 'pic',
      pic: { imr: [0xF9, 0xEF], base: [0x20, 0x28], active: null, note: 'IRQ 0, the timer, is still masked' },
      table: null,
      timeline: null,
      marks: null,
      terminal: null,
      code: { program: 'day11Counter', focus: ['count'], current: 'count', trace: true },
      memory: { ...DAY_11_END.memory, focus: null },
      writes: { ...DAY_11_END.writes, map: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Set the timer\'s rate',
    summary: 'The PIT counts down from a start value at 1,193,182 steps per second and raises ' +
      'IRQ 0 each time it reaches zero. A start value of 11,932 gives 100 interrupts a second.',
    detail: 'The odd frequency comes from the original PC, which divided its 14.318 MHz ' +
      'crystal by 12. The kernel writes a mode byte to port 0x43, then the start value to ' +
      'port 0x40 in two halves. It also adds a gate for INT 0x20 and opens IRQ 0 on the ' +
      'master PIC.',
    formula: '1,193,182 / 11,932 ≈ 100 Hz → one tick every 10 ms',
    time: '≈ 24 s',
    state: {
      tab: 'terminal',
      code: { program: 'day12Pit', focus: ['ports', 'init', 'mode', 'value', 'main'], current: 'handler' },
      pic: PIC(),
      terminal: { lines: PIT_LOG },
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Tick',
    summary: 'Every 10 ms, IRQ 0 arrives as interrupt 0x20. The handler ends the interrupt and ' +
      'adds 1 to timerctl.count.',
    detail: 'That\'s all it does, so it costs the CPU almost nothing. The main loop can now ' +
      'sleep in hlt again: the timer wakes it 100 times a second whether or not anything ' +
      'else happens. The timeline shows the first tenth of a second.',
    formula: 'count = hundredths of a second since init_pit',
    time: '≈ 24 s',
    state: {
      tab: 'code',
      code: { focus: ['handler', 'tick'], current: 'show' },
      pic: PIC(0),
      visual: 'timeline',
      timeline: {
        title: 'The first 100 ms after init_pit', start: 0, end: 100, unit: 'ms',
        lanes: [{ name: 'IRQ 0', marks: ticks(10, 100, 10) }, { name: 'count', marks: [{ at: 50, label: 'count = 5' }, { at: 100, label: '10' }] }],
      },
      terminal: null,
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'Show the time',
    summary: 'The window shows timerctl.count instead of a loop counter: the number now goes ' +
      'up by exactly 100 every second.',
    detail: 'After 42.13 seconds it reads 0000004213, on any CPU. The main loop sleeps between ' +
      'updates, so the CPU is idle almost all the time, which a CPU running flat out to ' +
      'count could never be.',
    time: '≈ 66 s',
    state: {
      tab: 'memory',
      graphics: screen({ count: 4213 }),
      writes: { winBuf: winBuf({ count: 4213 }) },
      visual: 'pic',
      pic: PIC(),
      code: { focus: ['show'], current: 'show' },
      regs: { 'EAX': reg('00001075', 'timerctl.count = 4213') },
      memory: { focus: { id: 'os_winbuf', note: 'The window, showing the time' } },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'Timers',
    summary: 'A timer is an alarm: a time, a FIFO, and a byte. When the time comes, the timer ' +
      'interrupt puts the byte into the FIFO.',
    detail: 'The main loop already waits on FIFOs for keys and the mouse, so timers fit right ' +
      'in: a byte arrives, the loop sees it is from a timer and acts. Here three timers run: ' +
      'one for 10 seconds, one for 3 seconds, and one every half second to blink a cursor.',
    time: '≈ 66 s',
    state: {
      tab: 'code',
      code: { program: 'day12Timers', focus: ['struct', 'set', 'use'], current: 'handler' },
      visual: 'table',
      table: TIMER_TABLE(0, [['timer1', 1000, 10, 'running', true], ['timer2', 300, 3, 'running', true], ['timer3', 50, 1, 'running', true]], 50),
      graphics: screen({ count: 0 }),
      writes: { winBuf: winBuf({ count: 0 }) },
      regs: { 'EAX': reg('00000000', 'Counting from 0 again for this example') },
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Store the moment, not the wait',
    summary: 'timer_settime stores when the timer goes off (now + wait), so the handler only ' +
      'compares, instead of counting every timer down on every tick.',
    detail: 'Counting down would mean touching all 500 timer slots 100 times a second. With ' +
      'absolute times, the handler also keeps timerctl.next, the earliest time due. On ' +
      'most ticks count is below next and the handler returns after one comparison; only ' +
      'when a timer is due does it look through the list.',
    formula: 'timer2: timeout = 0 + 300 → goes off when count reaches 300',
    time: '≈ 66 s',
    state: {
      code: { focus: ['absolute', 'next'], current: 'scan' },
    },
  },
  {
    id: 'B3',
    phase: 'B',
    title: 'Three timers at work',
    summary: 'Every half second the blink timer fires and is set again; at 3 seconds "3[sec]" ' +
      'appears; at 10 seconds, "10[sec]".',
    detail: 'The blink timer sends 1 and 0 alternately: on 1 the main loop draws a black ' +
      'block, on 0 a gray one, and sets the timer for another half second. Each message ' +
      'reaches the main loop through the same FIFO as everything else, in the order the ' +
      'times came.',
    time: '≈ 76 s',
    state: {
      tab: 'memory',
      graphics: screen({ count: 1000, message: '3[sec] 10[sec]', blink: true }),
      writes: { winBuf: winBuf({ count: 1000, message: '3[sec] 10[sec]', blink: true }) },
      visual: 'timeline',
      timeline: {
        title: 'The first 10 seconds', start: 0, end: 10, unit: 's',
        lanes: [
          { name: 'timer3 (blink)', marks: ticks(0.5, 10, 0.5) },
          { name: 'timer2', marks: [{ at: 3, label: '3[sec]' }] },
          { name: 'timer1', marks: [{ at: 10, label: '10[sec]' }] },
        ],
        note: 'Each mark is one byte put into the FIFO by inthandler20.',
      },
      code: { focus: ['fire', 'use'], current: 'handler' },
      regs: { 'EAX': reg('000003E8', 'timerctl.count = 1000') },
      memory: { focus: { id: 'os_winbuf', note: 'The window with both messages' } },
    },
  },
  {
    id: 'B4',
    phase: 'B',
    title: 'What day 12 did',
    summary: 'The OS keeps time in hundredths of a second, and any code can set a timer and ' +
      'hear about it through a FIFO.',
    detail: 'The PIT interrupts 100 times a second, the handler counts, and timers are ' +
      'checked against absolute times with a shortcut for "nothing due". There are still ' +
      'costs: a due timer means a scan of all 500 slots, and every source has its own ' +
      'FIFO. Day 13 keeps the timers sorted and puts every kind of event in one FIFO.',
    hint: 'Next, day 13: faster timers and one FIFO for everything.',
    milestone: { label: 'Timer', text: 'The OS keeps time' },
    time: '≈ 76 s',
    state: {
      visual: 'table',
      table: TIMER_TABLE(1000, [['timer1', 1000, 10, 'done', false], ['timer2', 300, 3, 'done', false], ['timer3', 1050, 0, 'running', true]], 1050),
    },
  },
]);

export const DAY_12 = Object.freeze({
  id: 'day12',
  title: 'Day 12',
  name: 'The timer',
  phases: PHASES,
  steps: STEPS,
});
