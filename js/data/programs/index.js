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
import { DAY10_ALLOC4K, DAY10_SHEET, DAY10_MAIN } from './day10.js';
import { DAY11_WINDOW, DAY11_COUNTER, DAY11_MAP } from './day11.js';
import { DAY12_PIT, DAY12_TIMERS } from './day12.js';
import { DAY13_PUTSHEET, DAY13_FIFO32, DAY13_TIMERLIST } from './day13.js';
import { DAY14_VBE, DAY14_KEYS, DAY14_DRAG } from './day14.js';
import { DAY15_TSS, DAY15_TASKB, DAY15_MTASK } from './day15.js';
import { DAY16_TASKS, DAY16_SLEEP, DAY16_LEVELS } from './day16.js';
import { DAY17_CONSOLE, DAY17_KEYS } from './day17.js';
import { DAY18_COMMANDS } from './day18.js';
import { DAY19_TYPE, DAY19_FAT, DAY19_RUN } from './day19.js';
import { DAY20_CALL, DAY20_API, DAY20_HELLO } from './day20.js';
import { DAY21_CRACK, DAY21_SEGMENTS, DAY21_EXCEPTION } from './day21.js';
import { DAY22_GLUE, DAY22_HEADER, DAY22_BUGS, DAY22_WINDOW } from './day22.js';
import { DAY23_API, DAY23_STARS } from './day23.js';
import { DAY24_WINDOWS, DAY24_TIMERS } from './day24.js';
import { DAY25_BEEP, DAY25_COLORS, DAY25_CONSOLES } from './day25.js';
import { DAY26_FAST, DAY26_CONSOLES } from './day26.js';
import { DAY27_LDT, DAY27_LIB } from './day27.js';

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
  day10Alloc4k: DAY10_ALLOC4K,
  day10Sheet: DAY10_SHEET,
  day10Main: DAY10_MAIN,
  day11Window: DAY11_WINDOW,
  day11Counter: DAY11_COUNTER,
  day11Map: DAY11_MAP,
  day12Pit: DAY12_PIT,
  day12Timers: DAY12_TIMERS,
  day13PutSheet: DAY13_PUTSHEET,
  day13Fifo32: DAY13_FIFO32,
  day13TimerList: DAY13_TIMERLIST,
  day14Vbe: DAY14_VBE,
  day14Keys: DAY14_KEYS,
  day14Drag: DAY14_DRAG,
  day15Tss: DAY15_TSS,
  day15TaskB: DAY15_TASKB,
  day15Mtask: DAY15_MTASK,
  day16Tasks: DAY16_TASKS,
  day16Sleep: DAY16_SLEEP,
  day16Levels: DAY16_LEVELS,
  day17Console: DAY17_CONSOLE,
  day17Keys: DAY17_KEYS,
  day18Commands: DAY18_COMMANDS,
  day19Type: DAY19_TYPE,
  day19Fat: DAY19_FAT,
  day19Run: DAY19_RUN,
  day20Call: DAY20_CALL,
  day20Api: DAY20_API,
  day20Hello: DAY20_HELLO,
  day21Crack: DAY21_CRACK,
  day21Segments: DAY21_SEGMENTS,
  day21Exception: DAY21_EXCEPTION,
  day22Glue: DAY22_GLUE,
  day22Header: DAY22_HEADER,
  day22Bugs: DAY22_BUGS,
  day22Window: DAY22_WINDOW,
  day23Api: DAY23_API,
  day23Stars: DAY23_STARS,
  day24Windows: DAY24_WINDOWS,
  day24Timers: DAY24_TIMERS,
  day25Beep: DAY25_BEEP,
  day25Colors: DAY25_COLORS,
  day25Consoles: DAY25_CONSOLES,
  day26Fast: DAY26_FAST,
  day26Consoles: DAY26_CONSOLES,
  day27Ldt: DAY27_LDT,
  day27Lib: DAY27_LIB,
});
