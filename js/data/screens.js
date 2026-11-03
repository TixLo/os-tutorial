// Drawing lists for the OS's screens (see core/raster.js), built the same way the
// kernel's C code draws them, so the pictures match the code shown in each chapter.

import { C } from './palettes.js';

export const box = (color, x0, y0, x1, y1) => ({ op: 'box', color, x0, y0, x1, y1 });

// Day 4's desktop: background, taskbar, start button, and tray (DAY4_DESKTOP)
export function desktop(w = 320, h = 200) {
  return [
    box(C.teal, 0, 0, w - 1, h - 29),
    box(C.lightGray, 0, h - 28, w - 1, h - 28),
    box(C.white, 0, h - 27, w - 1, h - 27),
    box(C.lightGray, 0, h - 26, w - 1, h - 1),

    box(C.white, 4, h - 24, 56, h - 24),
    box(C.white, 3, h - 24, 3, h - 4),
    box(C.darkGray, 4, h - 4, 56, h - 4),
    box(C.darkGray, 56, h - 23, 56, h - 5),
    box(C.black, 3, h - 3, 57, h - 3),
    box(C.black, 57, h - 24, 57, h - 3),

    box(C.darkGray, w - 46, h - 24, w - 4, h - 24),
    box(C.darkGray, w - 46, h - 23, w - 46, h - 4),
    box(C.white, w - 46, h - 3, w - 4, h - 3),
    box(C.white, w - 3, h - 24, w - 3, h - 3),
  ];
}

// A graphics state for a 320 × 200 screen
export const screen320 = (ops) => ({ width: 320, height: 200, ops });

// The close button on a window's title bar: @ black, $ dark gray, Q light gray, O white
export const CLOSE_BUTTON = Object.freeze([
  'OOOOOOOOOOOOOOO@',
  'OQQQQQQQQQQQQQ$@',
  'OQQQQQQQQQQQQQ$@',
  'OQQQ@@QQQQ@@QQ$@',
  'OQQQQ@@QQ@@QQQ$@',
  'OQQQQQ@@@@QQQQ$@',
  'OQQQQQQ@@QQQQQ$@',
  'OQQQQQ@@@@QQQQ$@',
  'OQQQQ@@QQ@@QQQ$@',
  'OQQQ@@QQQQ@@QQ$@',
  'OQQQQQQQQQQQQQ$@',
  'OQQQQQQQQQQQQQ$@',
  'O$$$$$$$$$$$$$$@',
  '@@@@@@@@@@@@@@@@',
]);
const CLOSE_COLORS = Object.freeze({ '@': C.black, $: C.darkGray, Q: C.lightGray, O: C.white });

// A window drawn the way make_window draws it (day 11), at (x, y) on whatever it is
// drawn into: raised frame, light gray face, title bar, close button. `active` picks the
// title bar's color (day 13 dims inactive windows).
export function windowOps(x, y, w, h, title, active = true) {
  const at = (color, x0, y0, x1, y1) => box(color, x + x0, y + y0, x + x1, y + y1);
  return [
    at(C.lightGray, 0, 0, w - 1, 0),
    at(C.white, 1, 1, w - 2, 1),
    at(C.lightGray, 0, 0, 0, h - 1),
    at(C.white, 1, 1, 1, h - 2),
    at(C.darkGray, w - 2, 1, w - 2, h - 2),
    at(C.black, w - 1, 0, w - 1, h - 1),
    at(C.lightGray, 2, 2, w - 3, h - 3),
    at(active ? C.darkBlue : C.darkGray, 3, 3, w - 4, 20),
    at(C.darkGray, 1, h - 2, w - 2, h - 2),
    at(C.black, 0, h - 1, w - 1, h - 1),
    { op: 'text', x: x + 6, y: y + 4, color: active ? C.white : C.lightGray, text: title },
    { op: 'bitmap', x: x + w - 21, y: y + 5, rows: CLOSE_BUTTON, colors: CLOSE_COLORS },
  ];
}

// Text on a light gray background inside a window, as putstr_on_sheet does (day 13)
export const textOn = (x, y, text, color = C.black, bg = C.lightGray) => [
  box(bg, x, y, x + text.length * 8 - 1, y + 15),
  { op: 'text', x, y, color, text },
];

// A sunken white text box (day 14): dark top and left edges, white bottom and right
export function textboxOps(x, y, w, h) {
  return [
    box(C.darkGray, x - 2, y - 2, x + w + 1, y - 2),
    box(C.darkGray, x - 2, y - 2, x - 2, y + h + 1),
    box(C.white, x - 2, y + h + 1, x + w + 1, y + h + 1),
    box(C.white, x + w + 1, y - 2, x + w + 1, y + h + 1),
    box(C.black, x - 1, y - 1, x + w, y - 1),
    box(C.black, x - 1, y - 1, x - 1, y + h),
    box(C.white, x, y, x + w, y + h),
  ];
}
