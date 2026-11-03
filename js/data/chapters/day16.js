// Day 16: a task manager with any number of tasks, tasks that sleep until their FIFO gets
// data, time slices of different lengths, and levels so input is handled first, with an
// idle task at the bottom.
// The programs are simplified teaching code (see js/data/programs/day16.js).

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { windowOps, textOn } from '../screens.js';
import { screen640 } from './day14.js';
import { DAY_15 } from './day15.js';

const PHASES = Object.freeze({
  A: 'A task manager',
  B: 'Sleep',
  C: 'Priorities',
});

const DAY_15_END = finalState(DAY_15.steps);

const reg = (value, note) => ({ value, note });

// Task A's window and three task B windows, each counting
function screen(counts = null) {
  const graphics = screen640({ text: 'HELL', cursor: true });
  if (!counts) return graphics;
  const windows = counts.flatMap((count, i) => {
    const x = 24 + i * 168;
    return [
      ...windowOps(x, 40, 144, 52, `task_b${i}`, false),
      ...textOn(x + 24, 68, String(count).padStart(11)),
    ];
  });
  // Task B windows go below task A's window and the mouse
  const cursor = graphics.ops.at(-1);
  return { ...graphics, ops: [...graphics.ops.slice(0, -1).filter((op) => !(op.op === 'text' && op.y === 176)), ...windows, cursor] };
}

const taskTable = (rows, note) => ({
  title: 'Tasks',
  head: ['Task', 'Selector', 'State', 'Level', 'Slice'],
  rows: rows.map(([name, sel, state, level, slice, focus]) => ({
    cells: [name, sel, state, String(level), slice], focus, dim: state === 'sleeping',
  })),
  note,
});

const span = (task, from, to, kind) => ({ task, from, to, kind });
function timeline(title, spans, note) {
  const names = [...new Set(spans.map((s) => s.task))];
  return {
    title, start: 0, end: 120, unit: 'ms',
    lanes: names.map((name) => ({
      name,
      spans: spans.filter((s) => s.task === name).map((s) => ({ from: s.from, to: s.to, label: name.replace('task ', ''), kind: s.kind })),
    })),
    note,
  };
}

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 15 stopped',
    summary: 'Two tasks take turns every 20 ms, but the switching code knows only those two, ' +
      'and task A burns half the CPU even while it waits for a key.',
    detail: 'Today the two hard-coded TSSs become a task manager: a table of up to 1,000 ' +
      'tasks, each with its own TSS and GDT entry, that can be started, put to sleep, woken ' +
      'up, and given more or less of the CPU.',
    time: '≈ 100 s',
    state: {
      ...DAY_15_END,
      tab: 'code',
      visual: 'none',
      table: null,
      timeline: null,
      terminal: null,
      code: { program: 'day15Mtask', focus: ['switch'], current: 'switch', trace: true },
      memory: { ...DAY_15_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'A table of tasks',
    summary: 'struct TASK holds a task\'s TSS, its GDT selector, and its state. task_alloc ' +
      'finds a free slot; task_run puts the task on the running list.',
    detail: 'Every task gets a TSS entry in the GDT when the manager starts: tasks0[0] uses ' +
      'entry 3 (0x18), tasks0[1] entry 4 (0x20), and so on. kernel_main becomes a task ' +
      'itself through task_init. Switching no longer flips between two selectors: ' +
      'task_switch moves to the next task on the running list.',
    time: '≈ 100 s',
    state: {
      code: { program: 'day16Tasks', focus: ['struct', 'alloc', 'switch'], current: null },
      visual: 'table',
      table: taskTable([
        ['task A (kernel_main)', '0x18', 'running', 0, '0.02 s', true],
        ['task B', '0x20', 'running', 0, '0.02 s', false],
      ], 'Slots 2 to 999 are free; their GDT entries 5 to 1002 are ready.'),
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'Sleep instead of hlt',
    summary: 'When task A has nothing in its FIFO, it calls task_sleep on itself: it leaves the ' +
      'running list and gets no more time slices.',
    detail: 'Before, an idle task A sat in hlt until the next timer tick, using up its whole ' +
      'slice doing nothing. A sleeping task costs nothing, and task B gets the CPU all to ' +
      'itself, counting twice as fast.',
    time: '≈ 101 s',
    state: {
      code: { program: 'day16Sleep', focus: ['sleep', 'main'], current: 'wake' },
      table: taskTable([
        ['task A (kernel_main)', '0x18', 'sleeping', 0, '0.02 s', true],
        ['task B', '0x20', 'running', 0, '0.02 s', false],
      ]),
      visual: 'timeline',
      timeline: timeline('Task A sleeps', [
        span('task A', 0, 4), span('task B', 4, 120, 'os'),
      ], 'A runs for 4 ms, finds its FIFO empty, and sleeps.'),
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Wake up on input',
    summary: 'fifo32_put knows which task owns the FIFO. If that task is asleep, putting data ' +
      'into its FIFO wakes it.',
    detail: 'A key press arrives through the keyboard interrupt, which puts 256 + code into ' +
      'task A\'s FIFO. The FIFO wakes task A, which runs at the next switch, handles the ' +
      'key, finds the FIFO empty, and goes back to sleep. A task only uses the CPU when it ' +
      'has something to do.',
    time: '≈ 102 s',
    state: {
      code: { focus: ['wake'], current: null },
      timeline: timeline('A key press wakes task A', [
        span('task A', 40, 44), span('task B', 0, 40, 'os'), span('task B', 44, 120, 'os'),
      ], 'Key at 31 ms; A runs from the next switch at 40 ms, then sleeps again.'),
    },
  },
  {
    id: 'B3',
    phase: 'B',
    title: 'Three counting tasks',
    summary: 'With a task manager, more tasks are easy: three copies of task B each count in a ' +
      'window of their own.',
    detail: 'Each gets its own stack and its own window, passed as its argument; the code is ' +
      'the same task_b_main. Running the same function as several tasks works because every ' +
      'task\'s local variables live on its own stack.',
    time: '≈ 105 s',
    state: {
      tab: 'memory',
      graphics: screen([30113412, 30109876, 30116243]),
      visual: 'table',
      table: taskTable([
        ['task A (kernel_main)', '0x18', 'sleeping', 0, '0.02 s', false],
        ['task_b0', '0x20', 'running', 0, '0.02 s', true],
        ['task_b1', '0x28', 'running', 0, '0.02 s', true],
        ['task_b2', '0x30', 'running', 0, '0.02 s', true],
      ], 'Equal slices: the three counts stay close together.'),
      code: { program: 'day16Levels', focus: ['run'], current: null },
      memory: { focus: { id: 'vbe_vram', note: 'Three task windows' } },
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'Longer slices for some',
    summary: 'A task\'s priority sets how long its slice is. With slices of 1, 2, and 3 ticks, ' +
      'the three counters grow at rates of 1 : 2 : 3.',
    detail: 'task_switch sets the switching timer to the new task\'s priority instead of a ' +
      'fixed 2 ticks. Nothing else changes: the tasks still take turns, but each turn lasts ' +
      'as long as its priority says.',
    formula: 'slices of 0.01 s, 0.02 s, 0.03 s → counts ≈ 1 : 2 : 3',
    time: '≈ 110 s',
    state: {
      graphics: screen([10051307, 20103218, 30152946]),
      table: taskTable([
        ['task A (kernel_main)', '0x18', 'sleeping', 1, '0.02 s', false],
        ['task_b0', '0x20', 'running', 2, '0.01 s', true],
        ['task_b1', '0x28', 'running', 2, '0.02 s', true],
        ['task_b2', '0x30', 'running', 2, '0.03 s', true],
      ]),
      visual: 'timeline',
      timeline: timeline('Slices of 10, 20, and 30 ms', [
        span('task_b0', 0, 10, 'os'), span('task_b1', 10, 30, 'os'), span('task_b2', 30, 60, 'os'),
        span('task_b0', 60, 70, 'os'), span('task_b1', 70, 90, 'os'), span('task_b2', 90, 120, 'os'),
      ]),
      code: { program: 'day16Tasks', focus: ['prio'], current: null },
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'Levels: input first',
    summary: 'Tasks are grouped in levels. Only the highest level with a running task gets the ' +
      'CPU; lower levels wait until it is empty.',
    detail: 'Task A, which handles the keyboard and mouse, is at level 1 and the counters at ' +
      'level 2. When a key wakes task A, the manager switches to level 1 at once, so the ' +
      'key is handled immediately, not after the counters\' slices. When A sleeps again, ' +
      'level 2 resumes.',
    time: '≈ 110 s',
    state: {
      code: { program: 'day16Levels', focus: ['init', 'run', 'pick'], current: null },
      timeline: timeline('A key at 25 ms: level 1 goes first', [
        span('task A', 25, 28), span('task_b0', 0, 10, 'os'), span('task_b1', 10, 25, 'os'),
        span('task_b1', 28, 33, 'os'), span('task_b2', 33, 63, 'os'), span('task_b0', 63, 73, 'os'), span('task_b1', 73, 93, 'os'), span('task_b2', 93, 120, 'os'),
      ], 'Task A interrupts task_b1\'s slice, handles the key, and sleeps.'),
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'The idle task',
    summary: 'If every task sleeps, there would be nothing to switch to. An idle task at the ' +
      'lowest level runs hlt forever and is always there.',
    detail: 'Like the sentinel timer on day 13, it removes a special case: the running list ' +
      'is never empty. The idle task only runs when nothing else can, and its hlt lets the ' +
      'CPU rest until the next interrupt.',
    time: '≈ 110 s',
    state: {
      code: { focus: ['idle'], current: null },
      visual: 'table',
      table: taskTable([
        ['task A (kernel_main)', '0x18', 'sleeping', 1, '0.02 s', false],
        ['task_b0–2', '0x20–0x30', 'running', 2, '0.01–0.03 s', false],
        ['idle', '0x38', 'running', 9, '0.01 s', true],
      ], 'Level 9 runs only while levels 0 to 8 have no running task.'),
    },
  },
  {
    id: 'C4',
    phase: 'C',
    title: 'What day 16 did',
    summary: 'The OS runs any number of tasks. Waiting tasks sleep, input wakes them, slices ' +
      'and levels decide who runs, and an idle task fills the gaps.',
    detail: 'This is a real scheduler, small but complete. With it, the OS can give each job ' +
      'its own task instead of crowding everything into kernel_main. Day 17 does exactly ' +
      'that for a console: a window with its own task, where commands can be typed.',
    hint: 'Next, day 17: the console.',
    milestone: { label: 'Scheduler', text: 'A real task manager' },
    time: '≈ 110 s',
    state: {
      tab: 'memory',
      memory: { focus: { id: 'os_gdt', note: 'TSS entries for the tasks', bytes: [0x270018, 0x27003F] } },
    },
  },
]);

export const DAY_16 = Object.freeze({
  id: 'day16',
  title: 'Day 16',
  name: 'Task management',
  phases: PHASES,
  steps: STEPS,
});
