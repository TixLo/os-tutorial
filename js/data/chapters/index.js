import { DAY_00 } from './day00.js';
import { DAY_01 } from './day01.js';
import { DAY_02 } from './day02.js';
import { DAY_03 } from './day03.js';
import { DAY_04 } from './day04.js';
import { DAY_05 } from './day05.js';
import { DAY_06 } from './day06.js';
import { DAY_07 } from './day07.js';

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
  ...Array.from({ length: 23 }, (_, i) => comingSoon(i + 8)),
]);
