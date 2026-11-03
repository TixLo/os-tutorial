// Day 6: the kernel is split into files, the two interrupt controllers are set up, and
// the keyboard's interrupt reaches a handler written in C.
// The programs are simplified teaching code (see js/data/programs/day06.js).
//
// From day 6, a step can set `pic` for the interrupt controller diagram (visual: 'pic'):
//   { imr: [master, slave], base: [master, slave] | null, active: irq | null, note }

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { screen320 } from '../screens.js';
import { DAY_05 } from './day05.js';

const PHASES = Object.freeze({
  A: 'Split the kernel',
  B: 'The interrupt controller',
  C: 'Interrupt handlers',
  D: 'The first interrupt',
});

const DAY_5_END = finalState(DAY_05.steps);

const reg = (value, note) => ({ value, note });
const hex2 = (value) => value.toString(16).toUpperCase().padStart(2, '0');
const IN_MAIN = reg('0000C3··', 'In kernel_main');

const DAY5_SCREEN = DAY_5_END.graphics.ops;
const KEY_MESSAGE = 'INT 0x21 (IRQ 1): keyboard';
const WITH_MESSAGE = [
  ...DAY5_SCREEN,
  { op: 'box', color: C.black, x0: 0, y0: 0, x1: KEY_MESSAGE.length * 8 - 1, y1: 15 },
  { op: 'text', x: 0, y: 0, color: C.white, text: KEY_MESSAGE },
];

// Interrupt gates at 0x26F800 + vector × 8. The handlers' addresses are an example:
// wherever the linker put asm_inthandler21 and asm_inthandler2c.
const HANDLER_21 = 0xC6A0;
const HANDLER_2C = 0xC6C0;
const gate = (offset) => [offset & 0xFF, (offset >> 8) & 0xFF, 0x08, 0x00, 0x00, 0x8E, 0x00, 0x00];
const IDT_GATES = {
  start: 0x26F800, end: 0x26FFFF, fill: 0,
  data: [[0x26F800 + 0x21 * 8, gate(HANDLER_21)], [0x26F800 + 0x2C * 8, gate(HANDLER_2C)]],
};

const ICW_LOG = [
  '> watch ports 0x20 0x21 0xA0 0xA1',
  'out 0x21 <- FF    mask all master inputs',
  'out 0xA1 <- FF    mask all slave inputs',
  'out 0x20 <- 11    master ICW1: begin setup',
  'out 0x21 <- 20    master ICW2: vectors from 0x20',
  'out 0x21 <- 04    master ICW3: slave on IRQ 2',
  'out 0x21 <- 01    master ICW4: 8086 mode',
  'out 0xA0 <- 11    slave ICW1: begin setup',
  'out 0xA1 <- 28    slave ICW2: vectors from 0x28',
  'out 0xA1 <- 02    slave ICW3: on master IRQ 2',
  'out 0xA1 <- 01    slave ICW4: 8086 mode',
  'out 0x21 <- FB    master: only IRQ 2 open',
  'out 0xA1 <- FF    slave: all masked',
];

const KEY_TRACE = [
  '> trace interrupts',
  'key pressed: keyboard controller raises IRQ 1',
  'master PIC: IRQ 1 open (IMR F9) -> INT 0x21 to the CPU',
  'CPU: IF = 1, finish current instruction (hlt)',
  `CPU: IDT[0x21] at 0x0026F908 -> 0008:0000${HANDLER_21.toString(16).toUpperCase()}`,
  'CPU: push EFLAGS, CS, EIP; IF = 0; jump',
  'asm_inthandler21 -> inthandler21 (C)',
];

const GATE_TABLE = {
  title: 'IDT entries set today',
  head: ['Vector', 'Bytes', 'Handler'],
  rows: [
    { cells: ['0x00–0x1F', '00 …', 'none (CPU exceptions)'], dim: true },
    { cells: ['0x20', '00 …', 'none (timer, day 12)'], dim: true },
    { cells: ['0x21', gate(HANDLER_21).map(hex2).join(' '), 'asm_inthandler21: keyboard'], focus: true },
    { cells: ['0x22–0x2B', '00 …', 'none'], dim: true },
    { cells: ['0x2C', gate(HANDLER_2C).map(hex2).join(' '), 'asm_inthandler2c: mouse'], focus: true },
    { cells: ['0x2D–0xFF', '00 …', 'none'], dim: true },
  ],
  note: 'Offset (handler address) · selector 0x0008 (code) · 8E = present, ring 0, 32-bit interrupt gate.',
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 5 stopped',
    summary: 'The kernel draws text and a cursor and has an empty IDT, but it hears nothing ' +
      'from the keyboard or the mouse.',
    detail: 'Every input of both interrupt controllers is still masked, as day 3 left them, ' +
      'and interrupts are off in the CPU. A key press changes nothing on screen. Today ' +
      'connects the keyboard to the kernel: the interrupt controller sends its signal to ' +
      'the CPU, and the CPU calls a function of ours.',
    time: '≈ 7 s',
    state: {
      ...DAY_5_END,
      regs: { ...DAY_5_END.regs, 'EIP': IN_MAIN },
      tab: 'code',
      visual: 'pic',
      pic: { imr: [0xFF, 0xFF], base: null, active: null },
      table: null,
      terminal: null,
      code: { program: 'day5Cursor', focus: ['sleep'], current: 'sleep', trace: true },
      memory: { ...DAY_5_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'One file per job',
    summary: 'kernel.c has grown long, so it is split into main.c, graphics.c, tables.c, ' +
      'and int.c, which share declarations through a header, kernel.h.',
    detail: 'Each .c file is compiled separately into an object file, and the linker joins ' +
      'them into kernel.sys. A header lists the functions and structs the files share, so ' +
      'main.c can call boxfill in graphics.c. With a Makefile, changing one file means ' +
      'recompiling only that file. The compiler is told there is no C library to rely on: ' +
      'the kernel is the only software on the machine.',
    time: '≈ 7 s',
    state: {
      code: { program: 'day6Build', focus: ['objs', 'rule', 'link', 'header'], current: null },
      visual: 'none',
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'Interrupts instead of asking',
    summary: 'A device that needs attention raises an interrupt request (IRQ). The interrupt ' +
      'controller passes it on to the CPU, which stops what it is doing and runs a handler.',
    detail: 'The alternative is polling: asking the keyboard again and again whether a key ' +
      'was pressed, which wastes almost all of the CPU\'s time. A PC has two 8259A ' +
      'interrupt controllers (PICs) with 8 inputs each. The second, the slave, is wired ' +
      'into input 2 of the first, the master, so 15 devices can interrupt. Each input has ' +
      'a mask bit in the IMR register: 1 means ignore it. Right now every bit is 1.',
    time: '≈ 7 s',
    state: {
      visual: 'pic',
      pic: { imr: [0xFF, 0xFF], base: null, active: null, note: 'Every input masked since day 3' },
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Set up the controllers',
    summary: 'init_pic sends each PIC four setup bytes (ICW1–4). The key one, ICW2, decides ' +
      'which interrupt numbers the IRQs become.',
    detail: 'The BIOS made IRQ 0–7 interrupts 0x08–0x0F. In protected mode those numbers ' +
      'belong to CPU exceptions (0x00–0x1F), so a timer tick would look like a CPU fault. ' +
      'The kernel moves IRQ 0–7 to 0x20–0x27 and IRQ 8–15 to 0x28–0x2F. ICW3 tells each ' +
      'chip how they are wired together. Afterward only IRQ 2, the link to the slave, is ' +
      'open.',
    formula: 'IRQ n on the master → INT 0x20 + n\nIRQ n on the slave → INT 0x28 + (n − 8)',
    time: '≈ 7 s',
    state: {
      tab: 'terminal',
      code: { program: 'day6Pic', focus: ['ports', 'maskall', 'master', 'slave', 'cascade'], current: null },
      regs: { 'EIP': reg('0000C7··', 'In init_pic'), 'EDX': reg('000000A1', 'The last port written') },
      pic: { imr: [0xFB, 0xFF], base: [0x20, 0x28], active: null, note: null },
      terminal: { lines: ICW_LOG },
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'A handler in C',
    summary: 'inthandler21 runs when the keyboard interrupts. For now it just prints a ' +
      'message at the top of the screen and stops.',
    detail: 'Reading which key was pressed is day 7. Today the goal is only to prove the ' +
      'interrupt arrives: a black strip and a line of text are enough. The mouse gets a ' +
      'matching handler, inthandler2c, for IRQ 12.',
    time: '≈ 7 s',
    state: {
      tab: 'code',
      code: { program: 'day6Handler', focus: ['kbd', 'show', 'stop', 'mouse'], current: null },
      regs: { 'EIP': IN_MAIN, 'EDX': reg('????????', 'Used by earlier code') },
      terminal: null,
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'Why a wrapper in assembly',
    summary: 'An interrupt can arrive between any two instructions, so the handler must ' +
      'leave every register exactly as it found it, and return with iretd.',
    detail: 'C functions freely change EAX, ECX, and EDX and end with ret. The interrupted ' +
      'code doesn\'t know it was interrupted, so asm_inthandler21 saves the segment ' +
      'registers and all general registers on the stack, sets DS and ES to the kernel\'s ' +
      'data segment, calls the C function, restores everything, and returns with iretd, ' +
      'which also restores EIP, CS, and EFLAGS that the CPU pushed.',
    time: '≈ 7 s',
    state: {
      code: { program: 'day6Wrapper', focus: ['save', 'arg', 'segs', 'call', 'restore', 'iret'], current: null },
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'Fill in the IDT',
    summary: 'Entries 0x21 and 0x2C of the IDT now point at the wrappers: code segment 0x08, ' +
      'the wrapper\'s address, and type 0x8E, an interrupt gate.',
    detail: 'When interrupt 0x21 arrives, the CPU reads 8 bytes at {0x26F800} + 0x21 × 8 = ' +
      '{0x26F908}, finds the handler there, and jumps to it. An interrupt gate also clears ' +
      'IF on the way in, so a second interrupt can\'t cut into the first. In this example ' +
      'the linker placed asm_inthandler21 at 0xC6A0.',
    formula: 'IDT[0x21] at {0x26F908}: A0 C6 · 08 00 · 00 · 8E · 00 00',
    time: '≈ 7 s',
    state: {
      tab: 'memory',
      code: { program: 'day6Main', focus: ['gates', 'init'], current: 'enable' },
      visual: 'table',
      table: GATE_TABLE,
      writes: { osIdt: IDT_GATES },
      memory: { focus: { id: 'os_idt', note: 'Gate 0x21: the keyboard handler', bytes: [0x26F908, 0x26F90F] } },
    },
  },
  {
    id: 'C4',
    phase: 'C',
    title: 'Open the gates',
    summary: 'sti lets the CPU take interrupts again, and new masks open IRQ 1 (keyboard) ' +
      'and IRQ 12 (mouse).',
    detail: 'Interrupts have been off since day 3. With the IDT filled in, sti sets IF back ' +
      'to 1. The master\'s mask becomes F9, opening IRQ 1 and IRQ 2, the path from the ' +
      'slave; the slave\'s becomes EF, opening IRQ 12. Every other device stays masked, ' +
      'because nothing would handle it. Then the kernel sleeps in hlt.',
    formula: 'master F9 = 1111 1001 → IRQ 1, 2 open\nslave  EF = 1110 1111 → IRQ 12 open',
    time: '≈ 7 s',
    state: {
      tab: 'code',
      code: { focus: ['enable', 'unmask'], current: 'sleep' },
      visual: 'pic',
      pic: { imr: [0xF9, 0xEF], base: [0x20, 0x28], active: null, note: null },
      regs: { 'EFLAGS': reg('00000202', 'IF = 1: interrupts are on') },
      memory: { focus: null },
    },
  },
  {
    id: 'D1',
    phase: 'D',
    title: 'Press a key',
    summary: 'A key press travels from the keyboard controller through IRQ 1 and the master ' +
      'PIC to the CPU, which looks up entry 0x21 and runs the handler.',
    detail: 'The CPU wakes from hlt, saves EFLAGS, CS, and EIP on the stack, clears IF, and ' +
      'jumps to asm_inthandler21, which calls inthandler21. The message appears at the top ' +
      'of the screen. The mouse doesn\'t interrupt yet even though IRQ 12 is open: the ' +
      'mouse itself has to be switched on first, which is day 7.',
    time: '≈ 9 s',
    state: {
      tab: 'terminal',
      graphics: screen320(WITH_MESSAGE),
      pic: { imr: [0xF9, 0xEF], base: [0x20, 0x28], active: 1, note: 'IRQ 1 → INT 0x21 → CPU' },
      code: { program: 'day6Handler', focus: ['show'], current: 'stop' },
      regs: {
        'EIP': reg('0000C8··', 'In inthandler21'),
        'EFLAGS': reg('00000002', 'IF = 0: cleared by the interrupt gate'),
        'ESP': reg('0008FFC4', 'Saved EIP, CS, EFLAGS, then the wrapper\'s pushes'),
      },
      terminal: { lines: KEY_TRACE },
    },
  },
  {
    id: 'D2',
    phase: 'D',
    title: 'What day 6 did',
    summary: 'The kernel is split into files, the PICs deliver IRQs as interrupts 0x20–0x2F, ' +
      'and a key press runs a C function.',
    detail: 'The path is complete: device, PIC, CPU, IDT, wrapper, C. But the handler ' +
      'stops the whole machine, and the key itself is never read, so the keyboard ' +
      'controller won\'t send another. Day 7 reads the key code, tells the PIC the ' +
      'interrupt is done, and returns.',
    hint: 'Next, day 7: reading keys and switching on the mouse.',
    milestone: { label: 'IRQ', text: 'The first interrupt' },
    time: '≈ 9 s',
    state: {
      tab: 'memory',
      pic: { imr: [0xF9, 0xEF], base: [0x20, 0x28], active: null, note: null },
      code: { focus: null },
      memory: { focus: { id: 'vram', note: 'The handler\'s message at the top of the screen' } },
    },
  },
]);

export const DAY_06 = Object.freeze({
  id: 'day6',
  title: 'Day 6',
  name: 'Interrupts',
  phases: PHASES,
  steps: STEPS,
});
