import { DAY_00 } from './day00.js';
import { DAY_01 } from './day01.js';

// Every chapter of the site, in order: day 0 (added by this site) and the book's 30 days.
// A chapter is { id, title, name, startsOff?, steps }. Each chapter's step 0 holds its full
// starting state, so a chapter can be opened directly without replaying earlier ones.
// Chapters without steps yet are listed as coming soon.
const comingSoon = (day) => Object.freeze({ id: `day${day}`, title: `Day ${day}`, steps: null });

export const CHAPTERS = Object.freeze([
  DAY_00,
  DAY_01,
  ...Array.from({ length: 29 }, (_, i) => comingSoon(i + 2)),
]);
