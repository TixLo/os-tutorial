import { HELLO_BOOT } from './helloBoot.js';
import { IPL } from './ipl.js';
import { KERNEL_HEAD, KERNEL_MAIN } from './kernel.js';
import {
  ASM_FUNCS, DAY4_WHITE, DAY4_STRIPES, DAY4_POINTER, DAY4_PALETTE, DAY4_BOXES, DAY4_DESKTOP,
} from './day04.js';
import { DAY5_STRUCT, DAY5_LETTER, DAY5_TEXT, DAY5_CURSOR, DAY5_TABLES } from './day05.js';
import { DAY6_BUILD, DAY6_PIC, DAY6_HANDLER, DAY6_WRAPPER, DAY6_MAIN } from './day06.js';
import { DAY7_KEY, DAY7_BUFFER, DAY7_FIFO, DAY7_MOUSE } from './day07.js';
import { DAY8_DECODE, DAY8_MOVE } from './day08.js';
import { DAY9_MEMTEST, DAY9_MEMTEST_SUB, DAY9_MEMMAN } from './day09.js';

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
  day6Build: DAY6_BUILD,
  day6Pic: DAY6_PIC,
  day6Handler: DAY6_HANDLER,
  day6Wrapper: DAY6_WRAPPER,
  day6Main: DAY6_MAIN,
  day7Key: DAY7_KEY,
  day7Buffer: DAY7_BUFFER,
  day7Fifo: DAY7_FIFO,
  day7Mouse: DAY7_MOUSE,
  day8Decode: DAY8_DECODE,
  day8Move: DAY8_MOVE,
  day9Memtest: DAY9_MEMTEST,
  day9MemtestSub: DAY9_MEMTEST_SUB,
  day9Memman: DAY9_MEMMAN,
});
