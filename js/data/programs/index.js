import { HELLO_BOOT } from './helloBoot.js';
import { IPL } from './ipl.js';
import { KERNEL_HEAD, KERNEL_MAIN } from './kernel.js';
import {
  ASM_FUNCS, DAY4_WHITE, DAY4_STRIPES, DAY4_POINTER, DAY4_PALETTE, DAY4_BOXES, DAY4_DESKTOP,
} from './day04.js';
import { DAY5_STRUCT, DAY5_LETTER, DAY5_TEXT, DAY5_CURSOR, DAY5_TABLES } from './day05.js';

// Programs a step can show in the code panel, by id
export const PROGRAMS = Object.freeze({
  helloBoot: HELLO_BOOT,
  ipl: IPL,
  kernelHead: KERNEL_HEAD,
  kernelMain: KERNEL_MAIN,
  asmFuncs: ASM_FUNCS,
  day4White: DAY4_WHITE,
  day4Stripes: DAY4_STRIPES,
  day4Pointer: DAY4_POINTER,
  day4Palette: DAY4_PALETTE,
  day4Boxes: DAY4_BOXES,
  day4Desktop: DAY4_DESKTOP,
  day5Struct: DAY5_STRUCT,
  day5Letter: DAY5_LETTER,
  day5Text: DAY5_TEXT,
  day5Cursor: DAY5_CURSOR,
  day5Tables: DAY5_TABLES,
});
