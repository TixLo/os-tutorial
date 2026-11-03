import { DAY_00 } from './day00.js';
import { DAY_01 } from './day01.js';
import { DAY_02 } from './day02.js';
import { DAY_03 } from './day03.js';
import { DAY_04 } from './day04.js';
import { DAY_05 } from './day05.js';
import { DAY_06 } from './day06.js';
import { DAY_07 } from './day07.js';
import { DAY_08 } from './day08.js';
import { DAY_09 } from './day09.js';
import { DAY_10 } from './day10.js';
import { DAY_11 } from './day11.js';
import { DAY_12 } from './day12.js';
import { DAY_13 } from './day13.js';
import { DAY_14 } from './day14.js';
import { DAY_15 } from './day15.js';
import { DAY_16 } from './day16.js';
import { DAY_17 } from './day17.js';
import { DAY_18 } from './day18.js';
import { DAY_19 } from './day19.js';
import { DAY_20 } from './day20.js';
import { DAY_21 } from './day21.js';
import { DAY_22 } from './day22.js';
import { DAY_23 } from './day23.js';
import { DAY_24 } from './day24.js';
import { DAY_25 } from './day25.js';
import { DAY_26 } from './day26.js';
import { DAY_27 } from './day27.js';
import { DAY_28 } from './day28.js';
import { DAY_29 } from './day29.js';

// Every chapter of the site, in order: day 0 (added by this site) and the book's 30 days.
// A chapter is { id, title, name, startsOff?, steps }. Each chapter's step 0 holds its full
// starting state, so a chapter can be opened directly without replaying earlier ones.
// Chapters without steps yet are listed as coming soon.
const comingSoon = (day) => Object.freeze({ id: `day${day}`, title: `Day ${day}`, steps: null });

export const CHAPTERS = Object.freeze([
  DAY_00,
  DAY_01,
  DAY_02,
  DAY_03,
  DAY_04,
  DAY_05,
  DAY_06,
  DAY_07,
  DAY_08,
  DAY_09,
  DAY_10,
  DAY_11,
  DAY_12,
  DAY_13,
  DAY_14,
  DAY_15,
  DAY_16,
  DAY_17,
  DAY_18,
  DAY_19,
  DAY_20,
  DAY_21,
  DAY_22,
  DAY_23,
  DAY_24,
  DAY_25,
  DAY_26,
  DAY_27,
  DAY_28,
  DAY_29,
  ...Array.from({ length: 1 }, (_, i) => comingSoon(i + 30)),
]);
