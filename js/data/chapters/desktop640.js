// The OS's 640 × 480 desktop from day 17 on: the background, the task_a window from day
// 14, a console window, any extra windows, and the mouse. Shared by the chapters that
// follow so the screen stays the same from day to day.

import { C } from '../palettes.js';
import { desktop, windowOps, textboxOps, consoleOps } from '../screens.js';
import { cursorAt } from './day05.js';

export const W = 640;
export const H = 480;
export const VRAM = 0xE0000000;
export const CONSOLE_AT = [40, 180];
export const TASK_A_AT = [340, 60];
const MOUSE = [470, 330];

const BACKGROUND = [
  ...desktop(W, H),
  { op: 'text', x: 8, y: 8, color: C.white, text: 'memory 32MB  free 28048KB' },
];

// options: console lines and focus, extra windows as drawing lists, mouse position
export function osScreen({
  lines = ['>'], consoleActive = true, cursor = true, consoleTitle = 'console',
  extra = [], mouse = MOUSE, taskA = true,
} = {}) {
  const [ax, ay] = TASK_A_AT;
  const ops = [...BACKGROUND];
  if (taskA) {
    ops.push(
      ...windowOps(ax, ay, 160, 52, 'task_a', !consoleActive),
      ...textboxOps(ax + 8, ay + 28, 144, 16),
    );
  }
  ops.push(...consoleOps(...CONSOLE_AT, lines, { active: consoleActive, cursor, title: consoleTitle }));
  ops.push(...extra, cursorAt(...mouse));
  return { width: W, height: H, base: VRAM, ops };
}

// The console's text for the TERMINAL tab
export const consoleTerminal = (lines) => ({ console: true, lines });

