// Day 15: a task state segment (TSS) holds everything needed to resume a task; a far
// jump to a TSS selector makes the CPU save one task and load another; switching on a
// timer runs two tasks at once.
// The programs are simplified teaching code (see js/data/programs/day15.js).

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { DAY_14, screen640 } from './day14.js';

const PHASES = Object.freeze({
  A: 'Task state segments',
  B: 'Switching',
  C: 'Multitasking',
});

const DAY_14_END = finalState(DAY_14.steps);

const reg = (value, note) => ({ value, note });
const hex = (value, width = 8) => '0x' + value.toString(16).toUpperCase().padStart(width, '0');
const hex2 = (value) => value.toString(16).toUpperCase().padStart(2, '0');
const IN_MAIN = reg('0000C3··', 'In kernel_main (task A)');
const IN_B = reg('0000D2··', 'In task_b_main');

// Example addresses where the linker put the two TSSs, and where task B's stack is
const TSS_A = 0xD000;
const TSS_B = 0xD068;
const STACK_B = DAY_14_END.memory.layout.find((region) => region.id === 'os_winbuf').end + 1;  // next free 64 KiB
const ESP_B = STACK_B + 0x10000 - 8;

const tssDescriptor = (base) => [0x67, 0x00, base & 0xFF, (base >> 8) & 0xFF, (base >> 16) & 0xFF, 0x89, 0x00, (base >>> 24) & 0xFF];
const GDT_WITH_TSS = {
  ...DAY_14_END.writes.osGdt,
  data: [
    ...DAY_14_END.writes.osGdt.data,
    [0x270018, [...tssDescriptor(TSS_A), ...tssDescriptor(TSS_B)]],
  ],
};

// The desktop with task B's counter on it
const screen = (countB = null) => {
  const graphics = screen640({ text: 'HELL', cursor: true });
  if (countB === null) return graphics;
  const text = String(countB).padStart(11);
  return {
    ...graphics,
    ops: [...graphics.ops,
      { op: 'box', color: C.teal, x0: 8, y0: 176, x1: 8 + 11 * 8 - 1, y1: 191 },
      { op: 'text', x: 8, y: 176, color: C.white, text }],
  };
};

const TSS_TABLE = {
  title: 'struct TSS32: 104 bytes per task',
  head: ['Offset', 'Fields', 'Holds'],
  rows: [
    { cells: ['0x00–0x1F', 'backlink, esp0–2, ss0–2, cr3', 'Used from day 21 (esp0, ss0) or not at all'], dim: true },
    { cells: ['0x20', 'eip', 'Where the task continues'], focus: true },
    { cells: ['0x24', 'eflags', 'Its flags, IF included'], focus: true },
    { cells: ['0x28–0x44', 'eax ecx edx ebx esp ebp esi edi', 'Its general registers'], focus: true },
    { cells: ['0x48–0x5C', 'es cs ss ds fs gs', 'Its segment registers'], focus: true },
    { cells: ['0x60–0x67', 'ldtr, iomap', '0 and 0x40000000 for now'], dim: true },
  ],
  note: 'The CPU itself writes and reads these fields when it switches tasks.',
};

const GDT_TABLE = {
  title: 'The GDT with two TSS entries',
  head: ['Selector', 'Entry', 'Bytes', 'Describes'],
  rows: [
    { cells: ['0x08', '1', 'FF FF 00 00 00 9A CF 00', 'Code, 4 GiB'], dim: true },
    { cells: ['0x10', '2', 'FF FF 00 00 00 92 CF 00', 'Data, 4 GiB'], dim: true },
    { cells: ['0x18', '3', tssDescriptor(TSS_A).map(hex2).join(' '), `TSS of task A at ${hex(TSS_A, 5)}`], focus: true },
    { cells: ['0x20', '4', tssDescriptor(TSS_B).map(hex2).join(' '), `TSS of task B at ${hex(TSS_B, 5)}`], focus: true },
  ],
  note: 'Limit 103 (0x67), type 0x89: an available 32-bit TSS.',
};

const TSS_B_TABLE = {
  title: 'tss_b before the first switch',
  head: ['Field', 'Value', 'Why'],
  rows: [
    { cells: ['eip', '&task_b_main', 'B starts at the top of its function'], focus: true },
    { cells: ['eflags', '0x00000202', 'Interrupts on'] },
    { cells: ['esp', hex(ESP_B), 'Its own 64 KiB stack, minus room for an argument'], focus: true },
    { cells: ['cs', '0x0008', 'Same code segment as A'] },
    { cells: ['ds es fs gs ss', '0x0010', 'Same data segment as A'] },
    { cells: ['[esp + 4]', 'sht_back', 'Its argument, where a call would put it'], focus: true },
  ],
};

const SWITCH_LOG = [
  '> trace task switch',
  'jmp far 0020:00000000 from task A (TR = 0018)',
  `save   registers and EIP into TSS 0x18 at ${hex(TSS_A, 5)}`,
  `load   registers and EIP from TSS 0x20 at ${hex(TSS_B, 5)}`,
  'TR = 0020, CS:EIP = 0008:task_b_main, ESP = ' + hex(ESP_B),
];

const timeline = (title, spans, note) => ({
  title, start: 0, end: 200, unit: 'ms',
  lanes: [
    { name: 'IRQ 0', marks: Array.from({ length: 20 }, (_, i) => ({ at: (i + 1) * 10 })) },
    { name: 'Task A', spans: spans.filter((s) => s.task === 'A').map((s) => ({ from: s.from, to: s.to, label: 'A' })) },
    { name: 'Task B', spans: spans.filter((s) => s.task === 'B').map((s) => ({ from: s.from, to: s.to, label: 'B', kind: 'os' })) },
  ],
  note,
});
const alternating = Array.from({ length: 10 }, (_, i) => ({ task: i % 2 ? 'B' : 'A', from: i * 20, to: (i + 1) * 20 }));

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 14 stopped',
    summary: 'Everything the OS does happens in one main loop. To do two things at once, the ' +
      'CPU must be able to put one program aside and pick up another.',
    detail: 'A running program is, from the CPU\'s point of view, its registers: where it is ' +
      '(EIP), its flags, its stack (ESP), and the rest. Save them, load another set, and the ' +
      'CPU continues a different program. x86 CPUs can do this themselves, with a task ' +
      'state segment (TSS) for each task.',
    time: '≈ 90 s',
    state: {
      ...DAY_14_END,
      regs: {
        ...DAY_14_END.regs,
        'EIP': IN_MAIN,
        'EAX': reg('????????', 'Used by earlier code'),
        'ECX': reg('????????', 'Used by earlier code'),
        'TR': reg('0000', 'Task register: no task set yet'),
      },
      tab: 'code',
      visual: 'none',
      table: null,
      timeline: null,
      marks: null,
      terminal: null,
      graphics: screen(),
      code: { program: 'day14Keys', focus: null, current: 'key', trace: true },
      memory: { ...DAY_14_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'A TSS per task',
    summary: 'A TSS is 104 bytes laid out exactly as the CPU expects, with a field for every ' +
      'register. Task A, the existing kernel_main, gets tss_a; a new task B gets tss_b.',
    detail: 'The CPU fills in a TSS when it leaves a task and reads it when it enters one. ' +
      'The kernel only has to prepare the TSS of a task that has never run. ldtr and iomap ' +
      'get fixed values; the stack fields at the start matter once applications get their ' +
      'own privilege level, on day 21.',
    time: '≈ 90 s',
    state: {
      code: { program: 'day15Tss', focus: ['struct', 'regs', 'decl'], current: 'gdt' },
      visual: 'table',
      table: TSS_TABLE,
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'TSSs live in the GDT',
    summary: 'Each TSS gets a GDT entry of type 0x89, selectors 0x18 and 0x20. ltr 0x18 tells ' +
      'the CPU that what is running now is task A.',
    detail: 'Selectors pick segments, and a TSS is a segment too: its entry gives its address ' +
      'and size. The task register (TR) holds the selector of the current task\'s TSS, so ' +
      'the CPU knows where to save registers at the next switch.',
    time: '≈ 90 s',
    state: {
      tab: 'memory',
      code: { focus: ['gdt', 'ltr'], current: 'prepare' },
      table: GDT_TABLE,
      writes: { osGdt: GDT_WITH_TSS },
      regs: { 'TR': reg('0018', 'Task register: task A\'s TSS') },
      memory: { focus: { id: 'os_gdt', note: 'Entries 3 and 4: the two TSSs', bytes: [0x270018, 0x270027] } },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'Prepare task B',
    summary: 'Task B needs a stack of its own and a starting point: tss_b.eip is task_b_main, ' +
      'and tss_b.esp the top of a new 64 KiB block.',
    detail: 'Sharing A\'s stack would let the two tasks overwrite each other\'s local ' +
      'variables. The segment registers get the same code and data segments as A. B\'s one ' +
      'argument, the background layer, is written just above its stack pointer, where a ' +
      'normal call would have left it.',
    time: '≈ 90 s',
    state: {
      tab: 'code',
      code: { focus: ['prepare', 'arg'], current: 'jump' },
      table: TSS_B_TABLE,
      memory: { layout: [...DAY_14_END.memory.layout, { id: 'os_stack_b', start: STACK_B, end: STACK_B + 0xFFFF, name: 'Task B\'s stack', kind: 'ram' }], focus: null },
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Switch with a far jump',
    summary: 'jmp far to selector 0x20 is not an ordinary jump: because 0x20 is a TSS, the CPU ' +
      'saves task A into tss_a and loads task B from tss_b.',
    detail: 'In one instruction every register changes. EIP now points into task_b_main, ESP ' +
      'into B\'s stack, and TR is 0x20. The offset in the jump is ignored. Task A is frozen ' +
      'right after its farjmp call, with everything it had saved in tss_a.',
    time: '≈ 95 s',
    state: {
      tab: 'terminal',
      code: { program: 'day15TaskB', focus: ['func'], current: 'loop' },
      visual: 'none',
      table: null,
      regs: {
        'EIP': IN_B,
        'ESP': reg(ESP_B.toString(16).toUpperCase().padStart(8, '0'), 'Task B\'s stack'),
        'EFLAGS': reg('00000202', 'From tss_b'),
        'TR': reg('0020', 'Task register: task B\'s TSS'),
      },
      terminal: { lines: SWITCH_LOG },
    },
  },
  {
    id: 'B3',
    phase: 'B',
    title: 'And back again',
    summary: 'When task B jumps to selector 0x18, the CPU saves B and reloads A from tss_a: A ' +
      'continues right after its own farjmp, as if nothing had happened.',
    detail: 'That is the whole trick of multitasking: each task\'s state is parked in its TSS ' +
      'while another runs. Neither task needs to know about the other\'s registers or stack. ' +
      'Here B gives the CPU back by itself; next, the timer decides.',
    time: '≈ 95 s',
    state: {
      regs: {
        'EIP': IN_MAIN,
        'ESP': reg('0008FFFC', 'Task A\'s stack again'),
        'EFLAGS': reg('00000202', 'From tss_a'),
        'TR': reg('0018', 'Task A'),
      },
      terminal: { lines: [...SWITCH_LOG, '', 'jmp far 0018:00000000 from task B (TR = 0020)', 'save B into TSS 0x20, load A from TSS 0x18', 'TR = 0018, continue after farjmp in task A'] },
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'Switch on a timer',
    summary: 'A timer set for every 20 ms makes the timer interrupt switch tasks: A, B, A, B, ' +
      'each running for 0.02 seconds at a time.',
    detail: 'The switch happens inside inthandler20, but only after the timer list has been ' +
      'brought up to date: a task switch in the middle would leave the list half-changed ' +
      'until the task came back. Neither task contains any code about switching; the timer ' +
      'takes the CPU away from one and gives it to the other.',
    formula: 'mt_timer every 2 ticks = 20 ms → 50 switches a second',
    time: '≈ 96 s',
    state: {
      tab: 'code',
      code: { program: 'day15Mtask', focus: ['decl', 'init', 'switch', 'late'], current: null },
      visual: 'timeline',
      timeline: timeline('Who runs, 200 ms', alternating, 'Each switch happens in the timer interrupt, every second tick.'),
      terminal: null,
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'Two tasks at once',
    summary: 'Task B counts on the desktop while task A keeps handling the keyboard, mouse, ' +
      'and windows. Both seem to run at the same time.',
    detail: 'Each gets half the CPU, in slices too short to notice. Task B\'s counter goes up ' +
      'in bursts of 20 ms; task A answers keys within at most 20 ms. Giving a task that only ' +
      'waits as much CPU as one that is busy is wasteful, which day 16 fixes.',
    time: '≈ 100 s',
    state: {
      tab: 'memory',
      graphics: screen(48302917),
      code: { program: 'day15TaskB', focus: ['count', 'show'], current: 'loop' },
      memory: { focus: { id: 'vbe_vram', note: 'Task B\'s counter at (8, 176)' } },
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'What day 15 did',
    summary: 'The CPU switches between two tasks fifty times a second, each with its own TSS ' +
      'and stack.',
    detail: 'TSSs in the GDT hold each task\'s registers, a far jump to a TSS selector ' +
      'switches, and a timer makes it happen without either task\'s help. Day 16 turns this ' +
      'into a task manager: any number of tasks, tasks that sleep when they have nothing ' +
      'to do, and priorities.',
    hint: 'Next, day 16: task management, sleep, and priorities.',
    milestone: { label: 'Tasks', text: 'Two tasks at once' },
    time: '≈ 100 s',
    state: {
      visual: 'timeline',
    },
  },
]);

export const DAY_15 = Object.freeze({
  id: 'day15',
  title: 'Day 15',
  name: 'Task switching',
  phases: PHASES,
  steps: STEPS,
});
