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
