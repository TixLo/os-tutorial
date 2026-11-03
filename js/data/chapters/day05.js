// Day 5: the kernel reads the screen settings through a struct, draws text with a font
// and a mouse cursor, and builds its own GDT and IDT in memory above 1 MiB.
// The programs are simplified teaching code (see js/data/programs/day05.js).

import { finalState } from '../../core/state.js';
import { C } from '../palettes.js';
import { desktop, screen320 } from '../screens.js';
import { glyphPicture } from '../font.js';
import { DAY_04 } from './day04.js';

const PHASES = Object.freeze({
  A: 'Read the boot info',
  B: 'Text',
  C: 'A mouse cursor',
  D: 'The OS\'s own tables',
});

const DAY_4_END = finalState(DAY_04.steps);

const reg = (value, note) => ({ value, note });
const IN_MAIN = reg('0000C3··', 'In kernel_main');

// Drawing lists, each building on the one before
const text = (x, y, color, string) => ({ op: 'text', x, y, color, text: string });
const LETTER = [...desktop(), text(8, 8, C.white, 'A')];
const TEXT = [
  ...desktop(),
  text(8, 8, C.white, 'ABC 123'),
  text(31, 31, C.black, 'Hello, OS!'),
  text(30, 30, C.white, 'Hello, OS!'),
];
const NUMBER = [...TEXT, text(16, 64, C.white, 'scrnx = 320')];

// The cursor shape drawn for this site: * black, O white, . the desktop behind it
export const CURSOR_SHAPE = Object.freeze([
  '*...............',
  '**..............',
  '*O*.............',
  '*OO*............',
  '*OOO*...........',
  '*OOOO*..........',
  '*OOOOO*.........',
  '*OOOOOO*........',
  '*OOOOOOO*.......',
  '*OOOOOOOO*......',
  '*OOOOO*****.....',
  '*OO*OO*.........',
  '*O*.*OO*........',
  '**...*OO*.......',
  '*.....*OO*......',
  '.......***......',
]);
export const cursorAt = (x, y, background = C.teal) => ({
  op: 'bitmap', x, y, rows: CURSOR_SHAPE, colors: { '*': C.black, O: C.white, '.': background },
});
const CURSOR_X = (320 - 16) / 2;
const CURSOR_Y = (200 - 28 - 16) / 2;
const WITH_CURSOR = [...NUMBER, cursorAt(CURSOR_X, CURSOR_Y)];

// The OS's tables above 1 MiB, from today on
export const OS_TABLES_LAYOUT = Object.freeze([
  { id: 'os_idt', start: 0x26F800, end: 0x26FFFF, name: 'IDT: interrupt table (256 entries)', kind: 'ram' },
  { id: 'os_gdt', start: 0x270000, end: 0x27FFFF, name: 'GDT: segment table (8,192 entries)', kind: 'ram' },
]);
const CODE_ENTRY = [0xFF, 0xFF, 0x00, 0x00, 0x00, 0x9A, 0xCF, 0x00];
const DATA_ENTRY = [0xFF, 0xFF, 0x00, 0x00, 0x00, 0x92, 0xCF, 0x00];
const GDT_EMPTY = { start: 0x270000, end: 0x27FFFF, fill: 0, data: [] };
const GDT_FILLED = { ...GDT_EMPTY, data: [[0x270008, [...CODE_ENTRY, ...DATA_ENTRY]]] };
const IDT_EMPTY = { start: 0x26F800, end: 0x26FFFF, fill: 0, data: [] };

const hexBytes = (bytes) => bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
const GDT_TABLE = (focus) => ({
  title: 'The OS\'s GDT at 0x270000',
  head: ['Selector', 'Entry', 'Bytes', 'Segment'],
  rows: [
    { cells: ['0x0000', '0', hexBytes(new Array(8).fill(0)), 'Must be empty'], dim: true },
    { cells: ['0x0008', '1', hexBytes(CODE_ENTRY), 'Code: base 0, limit 4 GiB'], focus: focus === 'code' },
    { cells: ['0x0010', '2', hexBytes(DATA_ENTRY), 'Data: base 0, limit 4 GiB'], focus: focus === 'data' },
    { cells: ['0x0018', '3', hexBytes(new Array(8).fill(0)), 'Empty, for later'], dim: true },
    { cells: ['…', '…', '…', '…'], dim: true },
    { cells: ['0xFFF8', '8191', hexBytes(new Array(8).fill(0)), 'Empty, for later'], dim: true },
  ],
  note: '8,192 entries × 8 bytes = 64 KiB. GDTR = size − 1 (0xFFFF) and the address.',
});
const DESCRIPTOR_TABLE = {
  title: 'Code entry 00CF9A00 0000FFFF, byte by byte',
  head: ['Byte', 'Value', 'Meaning'],
  rows: [
    { cells: ['0–1', 'FF FF', 'Limit, bits 0–15'] },
    { cells: ['2–3', '00 00', 'Base, bits 0–15'] },
    { cells: ['4', '00', 'Base, bits 16–23'] },
    { cells: ['5', '9A', 'Present, ring 0, code: run and read'], focus: true },
    { cells: ['6', 'CF', 'Flags C (4 KiB units, 32-bit) + limit bits 16–19 (F)'], focus: true },
    { cells: ['7', '00', 'Base, bits 24–31'] },
  ],
  note: 'Limit 0xFFFFF × 4 KiB = 4 GiB. Data entries are the same with 92 (read and write).',
};
const IDT_TABLE = {
  title: 'The OS\'s IDT at 0x26F800',
  head: ['Vector', 'Used for', 'Handler'],
  rows: [
    { cells: ['0x00–0x1F', 'CPU exceptions (divide by zero, ...)', 'none yet'], dim: true },
    { cells: ['0x20–0x2F', 'Hardware interrupts (from day 6)', 'none yet'], dim: true },
    { cells: ['0x30–0xFF', 'Free for the OS', 'none yet'], dim: true },
  ],
  note: '256 entries × 8 bytes = 2 KiB. IDTR = 0x7FF and the address.',
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 4 stopped',
    summary: 'The kernel draws a desktop, but the screen size and the address of video ' +
      'memory are typed into the code as 320, 200, and 0xA0000.',
    detail: 'Those numbers are only right for the mode day 3 picked. kernel.asm already ' +
      'wrote the real values to the boot info at {0x0FF0} before leaving real mode, so ' +
      'the C code should read them from there. Today also adds text, a mouse cursor, and ' +
      'the tables the CPU needs before interrupts can work.',
    time: '≈ 7 s',
    state: {
      ...DAY_4_END,
      regs: { ...DAY_4_END.regs, 'EIP': IN_MAIN },
      graphics: screen320(desktop()),
      palette: 'os',
      tab: 'memory',
      visual: 'none',
      table: null,
      terminal: null,
      code: { program: 'day4Desktop', focus: ['calldesk'], current: 'sleep', trace: true },
      memory: { ...DAY_4_END.memory, layout: [], focus: { id: 'free_low', note: 'Boot info from day 3', bytes: [0x00FF0, 0x00FFB] } },
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'A struct for the boot info',
    summary: 'A struct names each field of the boot info, in the order kernel.asm wrote ' +
      'them.',
    detail: 'C lays out a struct\'s fields one after another: three chars and a spare ' +
      'byte, then two shorts (2 bytes each), then a pointer (4 bytes). Pointing a struct ' +
      'pointer at {0x0FF0} lines the fields up with the bytes: binfo->scrnx is the short ' +
      'at {0x0FF4}, 40 01, which is 0x0140 = 320. The arrow -> means "the field of the ' +
      'struct this pointer points to".',
    formula: '0FF0 cyls 0A · 0FF1 leds 00 · 0FF2 vmode 08 · 0FF3 —\n' +
      '0FF4 scrnx 40 01 = 320 · 0FF6 scrny C8 00 = 200 · 0FF8 vram 00 00 0A 00 = 0xA0000',
    time: '≈ 7 s',
    state: {
      tab: 'code',
      code: { program: 'day5Struct', focus: ['struct', 'fields', 'pointer', 'arrow'], current: 'sleep' },
      regs: { 'EAX': reg('00000140', 'binfo->scrnx = 320'), 'ECX': reg('000000C8', 'binfo->scrny = 200') },
      terminal: { lines: ['> dump 0x0FF0 12', '00000FF0  0A 00 08 00 40 01 C8 00 00 00 0A 00'] },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'A letter is a small picture',
    summary: 'Each character of the font is 8 × 16 pixels, stored as 16 bytes: one byte ' +
      'per row, one bit per pixel.',
    detail: 'putfont goes through the 16 rows; in each row it tests the 8 bits from the ' +
      'left (0x80, 0x40, … 0x01) and writes the color only where a bit is 1, so the ' +
      'background shows through everywhere else. The letters on this site are designed ' +
      'on a 5 × 8 grid and each row is used twice, which fills the 8 × 16 cell.',
    formula: `"A" row by row:\n${glyphPicture('A').filter((_, i) => i % 2 === 0).map((row) => row.replace(/\./g, '·')).join('\n')}\n(each row twice: 38 38 44 44 … 00 00)`,
    time: '≈ 7 s',
    state: {
      tab: 'code',
      graphics: screen320(LETTER),
      code: { program: 'day5Letter', focus: ['putfont', 'testbit', 'glyph', 'callfont'], current: 'sleep' },
      regs: { 'EAX': reg('00000007', 'AL = 7: white'), 'ECX': reg('????????', 'Used by the drawing loops') },
      memory: { focus: { id: 'vram', note: 'Row 8 of the screen: the top of the A', bytes: [0xA0000 + 8 * 320, 0xA0000 + 8 * 320 + 15] } },
      terminal: null,
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'A whole font',
    summary: 'The kernel carries a font of 256 characters, 16 bytes each, and finds a ' +
      'character\'s rows at character code × 16.',
    detail: 'The font is a 4 KiB table assembled into the kernel. Characters are stored in ' +
      'ASCII order, so "A" (code 0x41) starts at byte 0x410. putstr walks a C string until ' +
      'the 0 byte that ends it and draws each character 8 pixels to the right of the last. ' +
      'Drawing the text once in black, then again in white one pixel up and to the left, ' +
      'gives it a shadow.',
    formula: '256 characters × 16 bytes = 4,096 bytes\n"A" = 0x41 → font + 0x41 × 16 = font + 0x410',
    time: '≈ 7 s',
    state: {
      graphics: screen320(TEXT),
      code: { program: 'day5Text', focus: ['font', 'putstr', 'lookup', 'strings', 'shadow'], current: 'number' },
      memory: { focus: { id: 'vram', note: 'Video memory with text drawn into it' } },
    },
  },
  {
    id: 'B3',
    phase: 'B',
    title: 'Numbers as text',
    summary: 'To show a number, the kernel first turns it into characters with sprintf, ' +
      'then draws the string.',
    detail: 'There is no operating system under ours to provide a C library, so the kernel ' +
      'includes a small sprintf of its own. It needs nothing but memory: it writes the ' +
      'digits of binfo->scrnx into the array s, and putstr draws them. Being able to print ' +
      'values on screen is how the next days check what the hardware is doing.',
    formula: 'sprintf(s, "scrnx = %d", 320) → "scrnx = 320"',
    time: '≈ 7 s',
    state: {
      graphics: screen320(NUMBER),
      code: { focus: ['number'], current: 'sleep' },
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'A mouse cursor',
    summary: 'The cursor is a 16 × 16 picture, written as text in the code and turned into ' +
      'color bytes, then copied to the middle of the screen.',
    detail: 'make_cursor turns each character of the shape into a color: * black, O white, ' +
      'and . the background color. Painting the background with the desktop\'s own teal ' +
      'makes the corners look transparent. putblock copies the 256 bytes into video memory ' +
      'one row at a time. Nothing moves it yet: that needs interrupts from the mouse ' +
      '(days 6 to 8).',
    formula: `x = (320 − 16) / 2 = ${CURSOR_X}    y = (200 − 28 − 16) / 2 = ${CURSOR_Y}`,
    time: '≈ 7 s',
    state: {
      graphics: screen320(WITH_CURSOR),
      code: { program: 'day5Cursor', focus: ['shape', 'make', 'block', 'center', 'callcursor'], current: 'sleep' },
      regs: { 'EAX': reg('00000098', `mx = ${CURSOR_X}`), 'ECX': reg('0000004E', `my = ${CURSOR_Y}`) },
      memory: { focus: { id: 'vram', note: 'The cursor\'s top row', bytes: [0xA0000 + CURSOR_Y * 320 + CURSOR_X, 0xA0000 + CURSOR_Y * 320 + CURSOR_X + 15] } },
    },
  },
  {
    id: 'D1',
    phase: 'D',
    title: 'Room for the OS\'s own tables',
    summary: 'The GDT from day 3 sits inside kernel.asm with 3 entries. The OS now builds ' +
      'a full-size GDT at {0x270000} and an IDT just below it at {0x26F800}.',
    detail: 'Both tables live in memory the CPU can only reach since protected mode, above ' +
      '1 MiB, where nothing else is. The GDT gets the most entries it can have, 8,192, ' +
      'which is 64 KiB; later days use them for tasks and applications. The IDT, which ' +
      'tells the CPU where to go when an interrupt arrives, has one entry for each of the ' +
      '256 interrupt numbers. First, every entry is cleared to zero.',
    formula: 'GDT {0x270000}–{0x27FFFF}: 8,192 × 8 bytes\nIDT {0x26F800}–{0x26FFFF}: 256 × 8 bytes',
    time: '≈ 7 s',
    state: {
      tab: 'memory',
      code: { program: 'day5Tables', focus: ['gdtinit', 'idtinit'], current: 'gdtfill' },
      regs: { 'EIP': reg('0000C5··', 'In init_tables'), 'EAX': reg('????????', 'Used by the loops'), 'ECX': reg('????????', 'Used by the loops') },
      memory: { layout: OS_TABLES_LAYOUT, focus: { id: 'os_gdt', note: 'The new GDT, all zeros so far' } },
      writes: { osGdt: GDT_EMPTY, osIdt: IDT_EMPTY },
    },
  },
  {
    id: 'D2',
    phase: 'D',
    title: 'Two segments, same as before',
    summary: 'Entries 1 and 2 get the same code and data segments as day 3, so selectors ' +
      '0x08 and 0x10 keep their meaning.',
    detail: 'An entry\'s base and limit are split up across its 8 bytes, a leftover from ' +
      'the 286, so set_segmdesc puts each piece in its place. The limit field has only 20 ' +
      'bits; for 4 GiB, set_segmdesc sets the G flag, which counts the limit in 4 KiB ' +
      'pages, and divides by 0x1000. The access byte says what the segment is: 9A for ' +
      'code that runs, 92 for data that can be written.',
    formula: '0xFFFFFFFF / 0x1000 = 0xFFFFF pages → 0xFFFFF × 4 KiB = 4 GiB',
    time: '≈ 7 s',
    state: {
      tab: 'code',
      code: { focus: ['segstruct', 'setseg', 'gran', 'gdtfill'], current: 'lgdt' },
      visual: 'table',
      table: DESCRIPTOR_TABLE,
      writes: { osGdt: GDT_FILLED },
      memory: { focus: { id: 'os_gdt', note: 'Entries 1 and 2', bytes: [0x270008, 0x270017] } },
    },
  },
  {
    id: 'D3',
    phase: 'D',
    title: 'Switch to the new GDT',
    summary: 'load_gdtr runs lgdt with the new table\'s size and address. From now on the ' +
      'CPU reads segments from {0x270000}.',
    detail: 'The segment registers keep working without a reload: CS is still 0x08 and DS ' +
      'is still 0x10, and the entries those selectors point to say exactly what the old ' +
      'ones said. The 3-entry table in kernel.asm is no longer used.',
    formula: 'GDTR: limit 0xFFFF (64 KiB − 1), base 0x00270000',
    time: '≈ 7 s',
    state: {
      code: { focus: ['lgdt'], current: 'idtinit' },
      table: GDT_TABLE('code'),
      regs: { 'GDTR': reg('FFFF @ 00270000', 'Limit and base of the new table') },
    },
  },
  {
    id: 'D4',
    phase: 'D',
    title: 'An empty IDT',
    summary: 'The IDT gets its 256 entries, all empty, and lidt tells the CPU where it is.',
    detail: 'Each IDT entry, called a gate, holds the code segment and address of a handler ' +
      'function. Vectors 0x00–0x1F are reserved for the CPU\'s own exceptions; the OS ' +
      'chooses where hardware interrupts go. Interrupts are still off (IF = 0) and every ' +
      'interrupt controller input is still masked, so an empty table is safe for now. ' +
      'Day 6 fills in the entries for the keyboard and the mouse.',
    formula: 'IDTR: limit 0x7FF (256 × 8 − 1), base 0x0026F800',
    time: '≈ 7 s',
    state: {
      tab: 'memory',
      code: { focus: ['gatestruct', 'idtinit', 'lidt'], current: 'init' },
      table: IDT_TABLE,
      regs: { 'IDTR': reg('07FF @ 0026F800', 'Limit and base of the IDT') },
      memory: { focus: { id: 'os_idt', note: 'The IDT: 256 empty gates' } },
    },
  },
  {
    id: 'D5',
    phase: 'D',
    title: 'What day 5 did',
    summary: 'The kernel reads its settings from the boot info, writes text and numbers, ' +
      'draws a mouse cursor, and has its own GDT and IDT.',
    detail: 'A struct turns the boot info into named fields; a font of 16-byte pictures ' +
      'turns strings into pixels; a 16 × 16 picture is the mouse cursor. The GDT now has ' +
      'room for 8,192 segments and the IDT is ready for interrupt handlers. The cursor ' +
      'can\'t move yet: the keyboard and mouse talk to the CPU through interrupts, and ' +
      'nothing handles them so far.',
    hint: 'Next, day 6: the interrupt controller and the first interrupt handlers.',
    milestone: { label: 'Text', text: 'Text, cursor, GDT and IDT' },
    time: '≈ 7 s',
    state: {
      visual: 'none',
      table: null,
      code: { program: 'day5Cursor', focus: null, current: 'sleep' },
      regs: { 'EIP': IN_MAIN },
      memory: { focus: { id: 'vram', note: 'The screen at the end of day 5' } },
    },
  },
]);

export const DAY_05 = Object.freeze({
  id: 'day5',
  title: 'Day 5',
  name: 'Text, a cursor, GDT and IDT',
  phases: PHASES,
  steps: STEPS,
});
