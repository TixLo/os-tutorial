// Day 25 (highlights): apps can beep through the timer chip's third counter and the PC
// speaker, the palette grows to 216 more colors, and the OS runs two consoles at once.
// The programs are simplified teaching code (see js/data/programs/day25.js).

import { finalState } from '../../core/state.js';
import { cube } from '../palettes.js';
import { windowOps, consoleOps, box } from '../screens.js';
import { osScreen, consoleTerminal } from './desktop640.js';
import { DAY_24 } from './day24.js';

const PHASES = Object.freeze({
  A: 'Sound, color, consoles',
});

const DAY_24_END = finalState(DAY_24.steps);

const show = (opts, lines) => ({
  graphics: osScreen({ lines, ...opts }),
  terminal: consoleTerminal(lines.slice(-8)),
});

// color.app: a 6 × 6 grid of red (across) and green (down), blue 0; then blue 3
const colorWindow = (x, y, b, title) => [
  ...windowOps(x, y, 144, 164, title, false),
  ...Array.from({ length: 36 }, (_, i) => {
    const r = i % 6;
    const g = Math.floor(i / 6);
    const x0 = x + 8 + Math.floor((r * 128) / 6);
    const y0 = y + 28 + Math.floor((g * 128) / 6);
    return box(cube(r, g, b), x0, y0, x + 8 + Math.floor(((r + 1) * 128) / 6) - 1, y + 28 + Math.floor(((g + 1) * 128) / 6) - 1);
  }),
];

const BEEP_TABLE = {
  title: 'Notes as timer counts',
  head: ['Note', 'Frequency', '1,193,180 / f'],
  rows: [
    { cells: ['A4', '440 Hz', '2,712'], focus: true },
    { cells: ['C5', '523.25 Hz', '2,280'] },
    { cells: ['A5', '880 Hz', '1,356'] },
  ],
  note: 'Port 0x61 bits 0 and 1 connect counter 2 to the speaker and switch it on.',
};

const SECOND_CONSOLE = consoleOps(330, 220, ['>mem', 'total   32MB', 'free 27384KB', '>'], { active: true });

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 24 stopped',
    summary: 'Windows can be handled with the mouse and apps have timers. Today: sound, more ' +
      'colors, and more than one console.',
    detail: 'Each is a small addition that reuses what already exists: the timer chip from day ' +
      '12, the palette from day 4, and the console task from day 17.',
    time: '≈ 165 s',
    state: {
      ...DAY_24_END,
      ...show({}, ['>']),
      tab: 'code',
      visual: 'none',
      table: null,
      code: { program: 'day24Timers', focus: null, current: null, trace: true },
      memory: { ...DAY_24_END.memory, focus: null },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'A beep',
    summary: 'The timer chip\'s counter 2 can make a square wave. Wired to the PC speaker ' +
      'through port 0x61, it beeps at whatever pitch its count sets.',
    detail: 'Counter 0 has ticked 100 times a second since day 12; counter 2 is free. API 20 ' +
      'sets its count to 1,193,180 divided by the frequency and switches the speaker on, or ' +
      'off for 0. An app plays a tune by beeping and waiting with a timer.',
    formula: 'count = 1,193,180 / frequency → 440 Hz: 2,712',
    time: '≈ 166 s',
    state: {
      code: { program: 'day25Beep', focus: ['api', 'on', 'off'], current: null },
      visual: 'table',
      table: BEEP_TABLE,
      terminal: { lines: ['> watch ports 0x42 0x43 0x61', 'out 0x43 <- B6    counter 2, square wave', 'out 0x42 <- 98', 'out 0x42 <- 0A    count 0x0A98 = 2,712: 440 Hz', 'in  0x61 -> 0C', 'out 0x61 <- 0F    speaker on'] },
      tab: 'terminal',
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: '216 more colors',
    summary: 'The OS fills palette entries 16 to 231 with a color cube: six levels each of red, ' +
      'green, and blue.',
    detail: 'Color 16 + r + g × 6 + b × 36 has red r × 51, green g × 51, blue b × 51. color.app ' +
      'draws red rising to the right and green rising downward, with no blue. The first 16 ' +
      'colors are untouched, so everything drawn so far looks the same.',
    formula: 'color = 16 + r + g × 6 + b × 36, with r, g, b from 0 to 5',
    time: '≈ 167 s',
    state: {
      tab: 'memory',
      palette: 'os216',
      visual: 'none',
      table: null,
      code: { program: 'day25Colors', focus: ['cube', 'app'], current: null },
      ...show({ extra: colorWindow(330, 120, 0, 'color'), consoleActive: false }, ['>color']),
      memory: { focus: { id: 'vbe_vram', note: 'The color window' } },
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'Mixing shades',
    summary: 'With blue at level 3 the same grid turns purple and teal. Shades between the ' +
      'levels can be faked by mixing two neighbors in a checkerboard.',
    detail: 'Six levels make visible steps. Alternating two adjacent colors pixel by pixel ' +
      'makes the eye see the color halfway between them, which doubles the number of shades ' +
      'without touching the palette. color2.app does this.',
    time: '≈ 168 s',
    state: {
      ...show({ extra: [...colorWindow(330, 120, 0, 'color'), ...colorWindow(160, 60, 3, 'color2')], consoleActive: false }, ['>color', '>color2']),
      code: { focus: ['app'], current: null },
    },
  },
  {
    id: 'A4',
    phase: 'A',
    title: 'Two consoles',
    summary: 'kernel_main starts two console tasks, each with its own window. Keys go to the ' +
      'task of whichever window is in front.',
    detail: 'Each layer now records its task, so routing a key is "put it in the FIFO of the ' +
      'front window\'s task". The two consoles run independently: one can run an app while ' +
      'the other lists files.',
    time: '≈ 170 s',
    state: {
      tab: 'terminal',
      palette: 'os216',
      code: { program: 'day25Consoles', focus: ['make', 'route'], current: null },
      ...show({ extra: SECOND_CONSOLE, consoleActive: false }, ['>color', '>color2', '>']),
      terminal: consoleTerminal(['>mem', 'total   32MB', 'free 27384KB', '>']),
    },
  },
  {
    id: 'A5',
    phase: 'A',
    title: 'What day 25 did',
    summary: 'Apps can make sounds and use 232 colors, and there are two consoles, each with ' +
      'its own task.',
    detail: 'Opening and closing consoles at will, and moving windows faster, come next.',
    hint: 'Next, day 26: faster windows and opening consoles.',
    milestone: { label: 'Sound', text: 'Sound, colors, two consoles' },
    time: '≈ 170 s',
    state: {
      tab: 'code',
    },
  },
]);

export const DAY_25 = Object.freeze({
  id: 'day25',
  title: 'Day 25',
  name: 'Sound, colors, consoles',
  phases: PHASES,
  steps: STEPS,
});
