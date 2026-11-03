// Day 17: a console window run by a task of its own, the keyboard handed between windows
// with Tab, Shift and Caps Lock, and Enter with scrolling. From today the TERMINAL tab
// mirrors the console window's text.
// The programs are simplified teaching code (see js/data/programs/day17.js).

import { finalState } from '../../core/state.js';
import { osScreen, consoleTerminal } from './desktop640.js';
import { DAY_16 } from './day16.js';

const PHASES = Object.freeze({
  A: 'A console task',
  B: 'A better keyboard',
  C: 'Lines and scrolling',
});

const DAY_16_END = finalState(DAY_16.steps);

const reg = (value, note) => ({ value, note });

const SHIFT_TABLE = {
  title: 'Two tables: without and with Shift',
  head: ['Code', 'Key', 'keytable0', 'keytable1'],
  rows: [
    { cells: ['0x02', '1', '\'1\'', '\'!\''], focus: true },
    { cells: ['0x03', '2', '\'2\'', '\'@\''] },
    { cells: ['0x0C', '-', '\'-\'', '\'_\''] },
    { cells: ['0x1E', 'A', '\'A\'', '\'A\''], focus: true },
    { cells: ['0x27', ';', '\';\'', '\':\''] },
    { cells: ['0x2A / 0xAA', 'Left Shift', 'down / up', '—'], dim: true },
    { cells: ['0x36 / 0xB6', 'Right Shift', 'down / up', '—'], dim: true },
  ],
  note: 'Letters are capitals in both tables; Caps Lock and Shift together decide the case.',
};

const CASE_TABLE = {
  title: 'Upper or lower case',
  head: ['Caps Lock', 'Shift', 'A key gives'],
  rows: [
    { cells: ['off', 'up', 'a'], focus: true },
    { cells: ['off', 'down', 'A'] },
    { cells: ['on', 'up', 'A'] },
    { cells: ['on', 'down', 'a'], focus: true },
  ],
  note: 'Lights: command 0xED to the keyboard, then a byte: bit 0 Scroll, bit 1 Num, bit 2 Caps.',
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 16 stopped',
    summary: 'The OS runs many tasks with priorities, but the only thing to type into is a ' +
      'text box that does nothing with what it gets.',
    detail: 'An operating system needs a way to give it commands. Today adds a console: a ' +
      'window with a prompt, run by its own task, where text can be typed line by line. ' +
      'Days 18 to 22 then teach it commands and let it run programs.',
    time: '≈ 110 s',
    state: {
      ...DAY_16_END,
      tab: 'code',
      visual: 'none',
      table: null,
      timeline: null,
      terminal: null,
      code: { program: 'day16Levels', focus: ['run'], current: null, trace: true },
      memory: { ...DAY_16_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'A console with its own task',
    summary: 'kernel_main makes a console window and starts console_task for it. The task ' +
      'draws a prompt, ">", and sleeps until its FIFO gets something.',
    detail: 'The console is a window with a black text area, 30 characters by 8 lines. ' +
      'Everything about it, from the prompt to its own blinking cursor, lives in its task, so ' +
      'kernel_main stays in charge of only the keyboard, the mouse, and the windows. The ' +
      'TERMINAL tab now shows what the console window says, larger.',
    time: '≈ 111 s',
    state: {
      tab: 'terminal',
      graphics: osScreen({ lines: ['>'], consoleActive: false }),
      code: { program: 'day17Console', focus: ['task', 'prompt', 'loop'], current: 'loop' },
      terminal: consoleTerminal(['>']),
      regs: { 'EIP': reg('0000E1··', 'In console_task'), 'ESP': reg('····FFF4', 'The console task\'s own stack'), 'TR': reg('0038', 'The console\'s task') },
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Tab moves the keyboard',
    summary: 'Pressing Tab hands the keyboard from task_a\'s window to the console. The active ' +
      'window\'s title bar turns dark blue; the other turns gray.',
    detail: 'Key codes still arrive at task A, which handles the keyboard. When the console ' +
      'has the focus, task A turns each code into a character and puts it, plus 256, into ' +
      'the console task\'s FIFO, which wakes the console. Typing "dir" shows up after the ' +
      'prompt.',
    time: '≈ 113 s',
    state: {
      graphics: osScreen({ lines: ['>dir'] }),
      code: { program: 'day17Keys', focus: ['state', 'tab', 'char'], current: null },
      terminal: consoleTerminal(['>dir']),
      regs: { 'EIP': reg('0000C3··', 'In kernel_main (task A)'), 'ESP': reg('0008FFFC', 'Task A\'s stack'), 'EFLAGS': reg('00000202', 'IF = 1'), 'TR': reg('0018', 'Task A') },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'Shift',
    summary: 'Task A remembers whether a Shift key is down and uses a second table for shifted ' +
      'characters: Shift + 1 gives "!".',
    detail: 'Shift sends a press code and a release code like any key: 0x2A and 0xAA on the ' +
      'left, 0x36 and 0xB6 on the right. Two bits in key_shift track them. Without Shift ' +
      'the first table is used, with Shift the second.',
    time: '≈ 114 s',
    state: {
      tab: 'code',
      code: { focus: ['tables', 'shift', 'char'], current: null },
      visual: 'table',
      table: SHIFT_TABLE,
      graphics: osScreen({ lines: ['>DIR !'] }),
      terminal: consoleTerminal(['>DIR !']),
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Caps Lock and the lights',
    summary: 'Caps Lock flips a bit in key_leds, which decides with Shift whether a letter is ' +
      'upper or lower case, and the keyboard\'s light is switched to match.',
    detail: 'The BIOS left the lock keys\' state in the boot info at {0x0FF1}, so the OS starts ' +
      'where the BIOS was. The lights are on the keyboard itself: the OS sends the keyboard ' +
      'command 0xED and then a byte with one bit per light, through a small queue so it ' +
      'never sends while the keyboard is busy.',
    time: '≈ 115 s',
    state: {
      code: { focus: ['leds', 'caps'], current: null },
      table: CASE_TABLE,
      graphics: osScreen({ lines: ['>dir'] }),
      terminal: consoleTerminal(['>dir']),
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'Enter starts a new line',
    summary: 'Enter moves the console\'s cursor to the next line and draws a new prompt. ' +
      'Nothing runs yet: the console doesn\'t know any commands.',
    detail: 'The console task keeps cursor_x and cursor_y. Enter adds 16 to cursor_y, draws ' +
      '">" at the left, and sets cursor_x just after it. Backspace erases the character to ' +
      'the left of the cursor but never the prompt.',
    time: '≈ 117 s',
    state: {
      tab: 'terminal',
      visual: 'none',
      table: null,
      code: { program: 'day17Console', focus: ['enter', 'char'], current: 'loop' },
      graphics: osScreen({ lines: ['>dir', '>mem', '>'] }),
      terminal: consoleTerminal(['>dir', '>mem', '>']),
      regs: { 'EIP': reg('0000E1··', 'In console_task'), 'ESP': reg('····FFF4', 'The console task\'s own stack'), 'TR': reg('0038', 'The console\'s task') },
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'Scroll at the bottom',
    summary: 'On the last line, Enter moves every pixel row of the text area up by 16 and ' +
      'clears the bottom line: the text scrolls.',
    detail: 'The console\'s text lives only as pixels in its layer\'s buffer, so scrolling is ' +
      'a copy inside the buffer followed by one refresh of the text area. The top line is ' +
      'gone for good: the console keeps no history.',
    time: '≈ 125 s',
    state: {
      code: { focus: ['scroll'], current: null },
      graphics: osScreen({ lines: ['>dir', '>mem', '>cls', '>type', '>abc', '>Hello, OS!', '>12345', '>xyz', '>'] }),
      terminal: consoleTerminal(['>mem', '>cls', '>type', '>abc', '>Hello, OS!', '>12345', '>xyz', '>']),
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'What day 17 did',
    summary: 'The OS has a console: a window with its own task, a prompt, a cursor, and ' +
      'typing with Shift, Caps Lock, Enter, Backspace, and scrolling.',
    detail: 'Task A routes keys to whichever window has the focus, and the console task ' +
      'handles them. All it can do with a line so far is start a new one. Day 18 makes it ' +
      'understand its first commands, including one that lists the files on the disk.',
    hint: 'Next, day 18: the first commands.',
    milestone: { label: 'Console', text: 'A console to type in' },
    time: '≈ 125 s',
    state: {
      tab: 'memory',
      memory: { focus: { id: 'vbe_vram', note: 'The desktop with the console' } },
    },
  },
]);

export const DAY_17 = Object.freeze({
  id: 'day17',
  title: 'Day 17',
  name: 'The console',
  phases: PHASES,
  steps: STEPS,
});
