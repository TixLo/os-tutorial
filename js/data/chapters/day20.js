// Day 20: applications return to the console with a far return, and ask the OS for help
// through a software interrupt, INT 0x40: the first system calls. hello.app prints
// through them.
// The programs are simplified teaching code (see js/data/programs/day20.js).

import { finalState } from '../../core/state.js';
import { osScreen, consoleTerminal } from './desktop640.js';
import { filesOnDay, rootDirWrite, fatWrite, fileWrite, dirLines } from '../floppy.js';
import { HELLO_APP_BYTES } from '../programs/day20.js';
import { DAY_19 } from './day19.js';

const PHASES = Object.freeze({
  A: 'Coming back',
  B: 'System calls',
  C: 'hello.app',
});

const DAY_19_END = finalState(DAY_19.steps);

const reg = (value, note) => ({ value, note });
const hex2 = (value) => value.toString(16).toUpperCase().padStart(2, '0');
const IN_CONSOLE = reg('0000E1··', 'In console_task');

const HELLO_APP = filesOnDay(20).find((f) => f.name === 'HELLO' && f.ext === 'APP');
const APP_BASE = 0x4CC000;

const show = (lines) => ({
  graphics: osScreen({ lines }),
  terminal: consoleTerminal(lines.slice(-8)),
});

const LAYOUT = [
  ...DAY_19_END.memory.layout.filter((region) => region.id !== 'app_hlt'),
  { id: 'app_code', start: APP_BASE, end: APP_BASE + 0xFFF, name: 'The running app (code segment 1003)', kind: 'ram' },
];

const API_TABLE = {
  title: 'INT 0x40: the API so far',
  head: ['EDX', 'Does', 'Takes'],
  rows: [
    { cells: ['1', 'Print one character', 'AL = the character'], focus: true },
    { cells: ['2', 'Print a string ending in 0', 'EBX = its offset in the app'] },
    { cells: ['3', 'Print a string of known length', 'EBX = offset, ECX = length'] },
  ],
  note: 'Offsets are inside the app\'s segment; the OS adds the app\'s base (kept at 0x0FE8).',
};

const TRACE = [
  '> trace hello.app',
  'farcall 1F58:00000000          console -> hello.app',
  'int 0x40  EDX=1 AL=68 (h)      -> cons_putchar, iretd',
  'int 0x40  EDX=1 AL=65 (e)',
  'int 0x40  EDX=1 AL=6C (l)',
  'int 0x40  EDX=1 AL=6C (l)',
  'int 0x40  EDX=1 AL=6F (o)',
  'retf                           hello.app -> console',
];

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 19 stopped',
    summary: 'hlt.app runs in its own code segment but never comes back, and it has no way to ' +
      'show anything.',
    detail: 'Two things are needed. The console must call the app instead of jumping to it, ' +
      'so the app can return. And the app needs a way to ask the OS to do things only the ' +
      'OS can do, like drawing on the console. That is what an application programming ' +
      'interface, an API, is for.',
    time: '≈ 136 s',
    state: {
      ...DAY_19_END,
      ...show(['>hlt']),
      tab: 'code',
      visual: 'none',
      table: null,
      code: { program: 'day19Run', focus: ['jump'], current: 'app', trace: true },
      writes: { ...DAY_19_END.writes, rootDir: rootDirWrite(20), fat: fatWrite(20), helloApp: fileWrite(HELLO_APP, [...HELLO_APP_BYTES]), hltLoaded: null },
      memory: { ...DAY_19_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Call, and return with retf',
    summary: 'The console starts an app with a far call, which pushes the console\'s CS and EIP. ' +
      'The app ends with retf, a far return, which pops them and goes back.',
    detail: 'A far call is to a far jump what a call is to a jump. After the app returns, the ' +
      'console frees the app\'s memory and prints a new prompt. Typing the program\'s name, ' +
      'with or without ".app", is now enough to run it.',
    time: '≈ 137 s',
    state: {
      code: { program: 'day20Call', focus: ['func', 'name', 'load', 'call', 'back'], current: null },
      regs: { 'CS': reg('0008', 'Code segment, GDT entry 1'), 'CS base': reg('00000000', 'From the GDT entry'), 'EIP': IN_CONSOLE },
      csip: '0008:0000E1··',
      ...show(['>']),
      memory: { layout: LAYOUT, focus: null },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'Why an interrupt',
    summary: 'An app can\'t simply call cons_putchar: the function\'s address changes every time ' +
      'the kernel is rebuilt. An interrupt number never moves.',
    detail: 'INT n works as a call through the IDT: the CPU looks up entry n and jumps to its ' +
      'handler, saving EFLAGS, CS, and EIP so iretd can return. Interrupts 0x00–0x1F belong ' +
      'to the CPU and 0x20–0x2F to the hardware, so the OS picks 0x40 for its API. Apps ' +
      'only ever need to know that number.',
    time: '≈ 137 s',
    state: {
      code: { program: 'day20Api', focus: ['gate', 'entry'], current: null },
      memory: { focus: { id: 'os_idt', note: 'IDT entry 0x40: the API', bytes: [0x26F800 + 0x40 * 8, 0x26F800 + 0x40 * 8 + 7] } },
      writes: {
        osIdt: {
          ...DAY_19_END.writes.osIdt,
          data: [...DAY_19_END.writes.osIdt.data, [0x26F800 + 0x40 * 8, [0xE0, 0xC6, 0x08, 0x00, 0x00, 0x8E, 0x00, 0x00]]],
        },
      },
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Function numbers',
    summary: 'The app puts a function number in EDX and the function\'s inputs in other ' +
      'registers. hrb_api reads them all and does the job.',
    detail: 'asm_hrb_api pushes every register twice: once to restore them at the end, once as ' +
      'the arguments of hrb_api, in the order pushad uses. An app\'s addresses are offsets ' +
      'inside its own segment, so for strings the OS adds the app\'s base address, which the ' +
      'console stored at {0x0FE8} before calling the app.',
    time: '≈ 137 s',
    state: {
      code: { focus: ['api', 'base', 'fn'], current: null },
      visual: 'table',
      table: API_TABLE,
      memory: { focus: null },
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'hello.app',
    summary: 'hello.app walks through its text and, for each character, sets EDX to 1 and AL to ' +
      'the character and executes int 0x40. At the 0 byte it does retf.',
    detail: 'The text is part of the app, after its code, so it is read through CS, the app\'s ' +
      'own segment: [cs:ecx] means the byte at offset ECX of the app. The whole program is ' +
      `${HELLO_APP_BYTES.length} bytes.`,
    formula: HELLO_APP_BYTES.map(hex2).join(' '),
    time: '≈ 138 s',
    state: {
      tab: 'memory',
      code: { program: 'day20Hello', focus: ['setup', 'loop', 'call', 'end', 'data'], current: 'setup' },
      visual: 'none',
      table: null,
      writes: { appLoaded: { start: APP_BASE, end: APP_BASE + HELLO_APP_BYTES.length - 1, data: [[APP_BASE, [...HELLO_APP_BYTES]]] } },
      memory: { focus: { id: 'app_code', note: 'hello.app, loaded', bytes: [APP_BASE, APP_BASE + 0x1F] } },
      regs: {
        'CS': reg('1F58', 'GDT entry 1003: hello.app'),
        'CS base': reg('004CC000', 'Where hello.app was loaded'),
        'EIP': reg('00000000', 'Its first instruction'),
      },
      csip: '1F58:00000000',
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'Run it',
    summary: 'Typing "hello" prints "hello" in the console, one system call per letter, and the ' +
      'prompt comes back.',
    detail: 'Each int 0x40 passes from the app into the kernel and back. The kernel draws in ' +
      'the console exactly as it does for typed characters, because to cons_putchar there is ' +
      'no difference. Then retf hands control back to the console, which frees the app\'s ' +
      'memory.',
    time: '≈ 138 s',
    state: {
      tab: 'terminal',
      ...show(['>hello', 'hello', '>']),
      code: { focus: ['call', 'end'], current: 'end' },
      regs: {
        'EIP': reg('00000016', 'At retf'),
        'EAX': reg('00000000', 'AL = 0: the end of the text'),
        'ECX': reg('0000001C', 'Offset of the 0 byte'),
        'EDX': reg('00000001', 'The last function used'),
      },
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'What day 20 did',
    summary: 'Applications return with retf and use the OS through INT 0x40, with a function ' +
      'number in EDX.',
    detail: 'This is the same shape as every OS\'s system calls: a fixed entry point, a number ' +
      'for the service, arguments in registers. One problem is wide open: an app can just as ' +
      'easily write anywhere in memory, the kernel included. Day 21 protects the OS.',
    hint: 'Next, day 21: protecting the OS from applications.',
    milestone: { label: 'API', text: 'System calls' },
    time: '≈ 138 s',
    state: {
      ...show(['>hello', 'hello', '>dir', ...dirLines(20), '>']),
      terminal: { lines: TRACE },
      regs: { 'CS': reg('0008', 'Back in the kernel'), 'CS base': reg('00000000', 'From the GDT entry'), 'EIP': IN_CONSOLE },
      csip: '0008:0000E1··',
    },
  },
]);

export const DAY_20 = Object.freeze({
  id: 'day20',
  title: 'Day 20',
  name: 'System calls',
  phases: PHASES,
  steps: STEPS,
});
