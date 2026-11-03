// Day 24 (highlights): windows can be switched with F11 or a click, dragged by their title
// bars, and closed with the close button, and apps get timers.
// The programs are simplified teaching code (see js/data/programs/day24.js).

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { windowOps, textOn, box } from '../screens.js';
import { osScreen, consoleTerminal } from './desktop640.js';
import { DAY_23 } from './day23.js';

const PHASES = Object.freeze({
  A: 'Window handling',
});

const DAY_23_END = finalState(DAY_23.steps);

const show = (opts, lines) => ({
  graphics: osScreen({ lines, ...opts }),
  terminal: consoleTerminal(lines.slice(-8)),
});

const noodle = (x, y, time, active = true) => [
  ...windowOps(x, y, 150, 50, 'noodle', active),
  box(C.white, x + 28, y + 27, x + 115, y + 41),
  { op: 'text', x: x + 28, y: y + 27, color: C.black, text: time },
];
const winhelo = (x, y, active = false) => [
  ...windowOps(x, y, 150, 50, 'winhelo', active),
  box(C.yellow, x + 8, y + 36, x + 141, y + 43),
  ...textOn(x + 28, y + 28, 'hello, world'),
];

const TIMER_TABLE = {
  title: 'INT 0x40 functions added today',
  head: ['EDX', 'Function'],
  rows: [
    { cells: ['16', 'Allocate a timer'] },
    { cells: ['17', 'Set the number it sends (arrives like a key, + 256)'] },
    { cells: ['18', 'Start it for n hundredths of a second'] },
    { cells: ['19', 'Free it'] },
  ],
  note: 'Timers an app forgets are freed when it ends, like its windows.',
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 23 stopped',
    summary: 'Apps open and close windows, but the user can\'t do much with them: no way to ' +
      'bring one to the front, move it properly, or close it with the mouse.',
    detail: 'Since day 14, holding the button anywhere dragged the one window. Today task A ' +
      'works out which window is under the mouse, from the top layer down, and acts on that ' +
      'window: bring it forward, drag it by its title bar, or close it.',
    time: '≈ 158 s',
    state: {
      ...DAY_23_END,
      ...show({ extra: winhelo(300, 300) }, ['>winhelo', '>']),
      tab: 'code',
      visual: 'none',
      table: null,
      code: { program: 'day14Drag', focus: ['drag'], current: null, trace: true },
      memory: { ...DAY_23_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'F11: cycle the windows',
    summary: 'F11 moves the bottom window (height 1, just above the background) to the top, ' +
      'just under the mouse.',
    detail: 'Pressing it repeatedly brings each window forward in turn. It is one call to ' +
      'sheet_updown, which already redraws whatever the change uncovers or covers.',
    time: '≈ 159 s',
    state: {
      code: { program: 'day24Windows', focus: ['f11'], current: null },
      ...show({ extra: winhelo(300, 300, true), consoleActive: false }, ['>winhelo', '>']),
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Click to bring forward',
    summary: 'A click goes to the topmost window under the mouse whose pixel there isn\'t ' +
      'see-through. That window moves to the front.',
    detail: 'Searching from the top layer down finds what the user actually sees under the ' +
      'pointer. Checking the see-through color means clicking a hole in a window, if it has ' +
      'one, reaches the window behind it.',
    time: '≈ 160 s',
    state: {
      code: { focus: ['click', 'find', 'front'], current: null },
      ...show({ extra: winhelo(300, 300, false), consoleActive: true, mouse: [120, 220] }, ['>winhelo', '>']),
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'Drag by the title bar',
    summary: 'Pressing on a title bar starts a drag; the window then moves by however far the ' +
      'mouse moves, until the button is released.',
    detail: 'Before, the window jumped so its corner sat under the pointer. Now task A ' +
      'remembers where the drag started (mmx, mmy) and slides the window by the difference, ' +
      'so it moves smoothly from wherever it was grabbed. Clicks elsewhere in a window only ' +
      'bring it forward.',
    time: '≈ 161 s',
    state: {
      code: { focus: ['drag'], current: null },
      ...show({ extra: winhelo(420, 330, true), consoleActive: false, mouse: [470, 340] }, ['>winhelo', '>']),
    },
  },
  {
    id: 'A4',
    phase: 'A',
    title: 'The close button',
    summary: 'A click on the × of an app\'s window ends that app, the same way as Shift + F1.',
    detail: 'The button\'s rectangle is fixed relative to the window\'s top right corner, so a ' +
      'simple bounds check finds it. Layers opened by apps carry a flag, so task A knows the ' +
      'window belongs to an app and which task to stop; ending the app then closes its ' +
      'windows as on day 23.',
    time: '≈ 162 s',
    state: {
      code: { focus: ['close'], current: null },
      ...show({ mouse: [560, 336] }, ['>winhelo', '>']),
    },
  },
  {
    id: 'A5',
    phase: 'A',
    title: 'Timers for apps',
    summary: 'Four API functions give apps timers that arrive like keys. noodle.app uses one ' +
      'to count seconds.',
    detail: 'An app\'s timer sends its number to the console task\'s FIFO, where api_getkey ' +
      'picks it up, so an app can wait for "a key or the timer" with one call. noodle stops ' +
      'when any real key is pressed.',
    time: '≈ 165 s',
    state: {
      tab: 'memory',
      code: { program: 'day24Timers', focus: ['api', 'app'], current: null },
      visual: 'table',
      table: TIMER_TABLE,
      ...show({ extra: noodle(420, 330, '    0:00:03'), consoleActive: false }, ['>noodle']),
      memory: { focus: { id: 'vbe_vram', note: 'noodle counting seconds' } },
    },
  },
  {
    id: 'A6',
    phase: 'A',
    title: 'What day 24 did',
    summary: 'Windows behave like windows: switch with F11 or a click, drag by the title bar, ' +
      'close with ×. Apps have timers.',
    detail: 'All of it lives in task A\'s mouse handling and a few API functions. Day 25 adds ' +
      'sound, many more colors, and a second console.',
    hint: 'Next, day 25: sound, colors, and more consoles.',
    milestone: { label: 'Windows', text: 'Switch, drag, and close windows' },
    time: '≈ 165 s',
    state: {
      tab: 'code',
      visual: 'none',
      table: null,
    },
  },
]);

export const DAY_24 = Object.freeze({
  id: 'day24',
  title: 'Day 24',
  name: 'Window handling',
  phases: PHASES,
  steps: STEPS,
});
