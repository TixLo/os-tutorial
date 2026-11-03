// Day 4: the first C code that draws. Writing bytes into video memory at 0xA0000 puts
// pixels on the screen; the palette decides what color each byte means; a rectangle
// function is enough to draw a simple desktop.
// The programs are simplified teaching code (see js/data/programs/day04.js).
//
// From day 4, steps can also set:
//   graphics  the picture in video memory as a drawing list (see js/core/raster.js)
//   palette   'vga' (the card's power-on colors) or 'os' (the 16 colors the OS sets)
//   table     a table diagram for the explanation panel, with visual: 'table'
//   terminal  { lines } shown in the TERMINAL tab, the debugger view

import { finalState } from '../../core/state.js';
import { PALETTES, OS_COLORS, C, to6bit } from '../palettes.js';
import { desktop, box, screen320 } from '../screens.js';
import { DAY_03 } from './day03.js';

const PHASES = Object.freeze({
  A: 'Write to video memory',
  B: 'Choose the colors',
  C: 'Draw shapes',
});

const DAY_3_END = finalState(DAY_03.steps);

const reg = (value, note) => ({ value, note });
const hex2 = (value) => value.toString(16).toUpperCase().padStart(2, '0');

// In 32-bit code the registers are shown at their full width
const START_REGS = {
  'CS':      reg('0008', 'Code segment, GDT entry 1'),
  'CS base': reg('00000000', 'From the GDT entry'),
  'EIP':     reg('0000C3··', 'In kernel_main, sleeping in hlt'),
  'EAX':     reg('????????', 'Left over from earlier code'),
  'ECX':     reg('????????', 'Left over from earlier code'),
  'EDX':     reg('????????', 'Left over from earlier code'),
  'ESP':     reg('0008FFFC', 'Stack: the return address of call kernel_main'),
  'DS / ES / SS': reg('0010', 'Data segment, GDT entry 2'),
  'EFLAGS':  reg('00000002', 'IF = 0: interrupts are still off'),
  'CR0':     reg('00000011', 'PE = 1: protected mode'),
  'GDTR':    reg('loaded', 'The 3-entry table from day 3'),
};
const IN_MAIN = reg('0000C3··', 'In kernel_main');
const SCRATCH = reg('????????', 'Used by the drawing loops');

const VRAM_FOCUS = (note) => ({ id: 'vram', note, bytes: [0xA0000, 0xA000F] });

// Debugger command: show the first 16 bytes of video memory
const dump = (bytes) => [
  '> dump 0xA0000 16',
  `000A0000  ${bytes.map(hex2).join(' ')}`,
];
const STRIPE_BYTES = Array.from({ length: 16 }, (_, i) => i);

const WHITE_SCREEN = screen320([{ op: 'fill', color: 15 }]);
const STRIPES = screen320([{ op: 'pattern', mask: 0x0F }]);
const BOXES = screen320([
  { op: 'fill', color: C.black },
  box(C.red, 20, 20, 119, 119),
  box(C.green, 70, 50, 169, 149),
  box(C.blue, 120, 80, 219, 179),
]);
const DESKTOP = screen320(desktop());

// Palette tables for the diagram
const paletteRows = (colors, names, focus = () => false) => colors.slice(0, 16).map((rgb, i) => ({
  cells: [String(i), `0x${hex2(i)}`, { swatch: rgb, text: rgb }, names ? names[i] : ''],
  focus: focus(i),
}));
const VGA_NAMES = ['Black', 'Blue', 'Green', 'Cyan', 'Red', 'Magenta', 'Brown', 'Light gray',
  'Dark gray', 'Light blue', 'Light green', 'Light cyan', 'Light red', 'Pink', 'Yellow', 'White'];
const VGA_TABLE = {
  title: 'Palette at power-on: colors 0–15 of 256',
  head: ['Color', 'Byte', 'RGB', 'Name'],
  rows: paletteRows(PALETTES.vga, VGA_NAMES),
  note: 'Each entry is 6 bits per channel inside the card; shown here as 8-bit hex.',
};
const OS_TABLE = {
  title: 'The OS\'s palette: colors 0–15',
  head: ['Color', 'Byte', 'RGB', 'Name'],
  rows: paletteRows(PALETTES.os, OS_COLORS.map((color) => color.name)),
  note: 'Colors 16–255 keep their power-on values. The OS only uses 0–15.',
};

// What the debugger sees on the card's two palette ports while set_palette runs
const channel = (rgb, i) => parseInt(rgb.slice(1 + i * 2, 3 + i * 2), 16);
const PORT_LOG = [
  '> watch ports 0x03C8 0x03C9',
  'out 0x03C8 <- 00          start writing at color 0',
  ...OS_COLORS.map(({ rgb, name }, i) => {
    const bytes = [0, 1, 2].map((c) => hex2(to6bit(channel(rgb, c)))).join(' ');
    return `out 0x03C9 <- ${bytes}    color ${String(i).padStart(2)}: ${name.toLowerCase()}`;
  }),
];

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 3 stopped',
    summary: 'The CPU is in 32-bit protected mode, running a C function that does nothing ' +
      'but sleep. The screen is in graphics mode, all black.',
    detail: 'Today the C code learns to draw. In 320 × 200 graphics mode, video memory ' +
      'starts at {0xA0000} with one byte per pixel, row by row. Every byte is 0 right now, ' +
      'and color 0 is black. Change a byte and the pixel changes.',
    formula: 'pixel (x, y) is the byte at {0xA0000} + y × 320 + x',
    time: '≈ 7 s',
    state: {
      ...DAY_3_END,
      cpu: 'protected',
      regs: START_REGS,
      monitor: 'graphics',
      graphics: screen320([{ op: 'fill', color: 0 }]),
      palette: 'vga',
      memory: { ...DAY_3_END.memory, focus: VRAM_FOCUS('Video memory: all zeros, all black') },
      code: { program: 'kernelMain', focus: ['loop'], current: 'loop', trace: true },
      tab: 'memory',
      visual: 'none',
      disk: { focus: null, note: null },
      gdt: { focus: null },
      table: null,
      terminal: { lines: dump(new Array(16).fill(0)) },
      csip: '0008:0000C3··',
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'A helper in assembly',
    summary: 'C has no statement for "write this byte to that address", so the first ' +
      'version calls a tiny assembly function, write_mem8.',
    detail: 'When C calls a function, it pushes the arguments onto the stack, last one ' +
      'first, and then the return address. So inside the function the first argument is ' +
      'at [esp+4] and the second at [esp+8]. write_mem8 loads them into ECX and AL and ' +
      'stores the byte with mov [ecx], al. The kernel is now two files: kernel.c and ' +
      'asmfunc.asm, linked together.',
    formula: '[esp] return address · [esp+4] addr · [esp+8] data',
    time: '≈ 7 s',
    state: {
      tab: 'code',
      code: { program: 'asmFuncs', focus: ['write'], current: 'write' },
      regs: { 'EIP': reg('0000C4··', 'In write_mem8') },
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Paint every pixel',
    summary: 'A loop calls write_mem8 for each of the 64,000 bytes of the screen with the ' +
      'value 15. The screen turns white.',
    detail: 'The loop runs i from {0xA0000} up to {0xA0000} + 64,000 and writes 15 into ' +
      'each byte. In the palette the card starts with, color 15 is white. The debugger ' +
      'shows the first bytes of video memory: all 0F now.',
    formula: '320 × 200 = 64,000 bytes = 0xFA00, so the screen ends at {0xAF9FF}',
    time: '≈ 7.1 s',
    state: {
      tab: 'memory',
      graphics: WHITE_SCREEN,
      code: { program: 'day4White', focus: ['loop'], current: 'sleep' },
      regs: {
        'EIP': IN_MAIN,
        'ECX': reg('000AF9FF', 'The last address written'),
        'EAX': reg('0000000F', 'AL = 0F: color 15'),
      },
      memory: { focus: VRAM_FOCUS('Video memory: every byte is 0F') },
      terminal: { lines: dump(new Array(16).fill(15)) },
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'Stripes',
    summary: 'Writing i & 0x0f instead of 15 gives each byte the lowest 4 bits of its ' +
      'address: 0, 1, 2, … 15, then 0 again.',
    detail: 'Along a row the colors run 0 to 15 and repeat every 16 pixels. A row is 320 ' +
      'pixels, which is exactly 20 × 16, so every row starts again at color 0 and the ' +
      'colors line up into vertical stripes. These are the card\'s power-on colors 0–15.',
    formula: 'byte at {0xA0000} + n = n & 0x0F → 00 01 02 … 0F 00 01 …',
    time: '≈ 7.1 s',
    state: {
      tab: 'memory',
      graphics: STRIPES,
      code: { program: 'day4Stripes', focus: ['pattern'], current: 'sleep' },
      regs: { 'EAX': reg('0000000F', 'The last value: 0xAF9FF & 0x0F = 0F') },
      memory: { focus: VRAM_FOCUS('Video memory: 00 01 02 … 0F, repeating') },
      terminal: { lines: dump(STRIPE_BYTES) },
    },
  },
  {
    id: 'A4',
    phase: 'A',
    title: 'Pointers',
    summary: 'A C pointer holds an address, and vram[i] reads or writes the byte at that ' +
      'address + i. No assembly helper needed.',
    detail: 'char *vram = (char *) 0xa0000 makes vram point at video memory, and ' +
      'vram[i] = … stores one byte (a char) at {0xA0000} + i. The compiler turns it into a ' +
      'single mov to memory, the same instruction write_mem8 used, without the call. The ' +
      'picture is the same; only the code is simpler.',
    formula: 'vram[i]  is the byte at  vram + i  =  0xA0000 + i',
    time: '≈ 7.1 s',
    state: {
      tab: 'code',
      code: { program: 'day4Pointer', focus: ['pointer', 'store'], current: 'sleep' },
      memory: { focus: VRAM_FOCUS('Video memory, written through a pointer') },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'Bytes are not colors',
    summary: 'A byte in video memory is only a color number. The video card looks it up in ' +
      'its palette: 256 entries of red, green, and blue.',
    detail: 'With one byte per pixel there are 256 possible numbers, and the palette says ' +
      'which color each one is. The card starts with a standard palette; its first 16 ' +
      'entries are the old text-mode colors, which is why the stripes look the way they ' +
      'do. The OS wants its own colors, so it rewrites the first 16 entries.',
    time: '≈ 7.1 s',
    state: {
      visual: 'table',
      table: VGA_TABLE,
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Sixteen colors of our own',
    summary: 'The kernel keeps a table of 16 colors, 3 bytes each, in the order it wants ' +
      'them numbered.',
    detail: 'Bright red, green, and blue, the colors between them, white, and darker shades ' +
      'for drawing windows and buttons: enough for a desktop. The C array lists each ' +
      'color\'s red, green, and blue as 0–255.',
    time: '≈ 7.1 s',
    state: {
      tab: 'code',
      code: { program: 'day4Palette', focus: ['table'], current: 'callpal' },
      table: { ...OS_TABLE, title: 'The colors the OS wants (not set yet)' },
    },
  },
  {
    id: 'B3',
    phase: 'B',
    title: 'Talk to the card through ports',
    summary: 'The palette lives inside the video card, not in memory. The CPU reaches it ' +
      'through I/O ports: out to 0x03C8 picks a color, out to 0x03C9 sends its red, green, ' +
      'and blue.',
    detail: 'After the starting color is written to port 0x03C8, every three bytes sent to ' +
      'port 0x03C9 set one color, and the card moves on to the next by itself. The card ' +
      'takes 6 bits per channel, so each value is divided by 4. The writes must not be ' +
      'interrupted halfway, so set_palette saves EFLAGS, turns interrupts off with cli, ' +
      'and puts EFLAGS back at the end. The TERMINAL tab shows the bytes the debugger saw, ' +
      'and the stripes already on the screen change color as each entry arrives.',
    formula: '0xFF / 4 = 0x3F = 63, the brightest a channel can be',
    time: '≈ 7.1 s',
    state: {
      tab: 'terminal',
      palette: 'os',
      code: { focus: ['setpal', 'guard', 'index', 'data'], current: 'loop' },
      regs: {
        'EIP': reg('0000C3··', 'In set_palette'),
        'EDX': reg('000003C9', 'The palette data port'),
        'EAX': reg('00000021', 'AL = 0x84 / 4 = 21: the last blue value'),
      },
      terminal: { lines: PORT_LOG },
      table: { ...OS_TABLE, rows: paletteRows(PALETTES.os, OS_COLORS.map((color) => color.name), () => true) },
    },
  },
  {
    id: 'B4',
    phase: 'B',
    title: 'Same bytes, new colors',
    summary: 'Not one byte of video memory changed, yet the stripes now show the OS\'s 16 ' +
      'colors.',
    detail: 'kernel_main draws the stripes again with exactly the same bytes, 00 01 02 … ' +
      '0F, as before. The card now looks them up in the new palette, so 01 is bright red ' +
      'instead of blue and 0E is teal instead of yellow. Changing the palette recolors the ' +
      'whole screen at once, without touching memory.',
    time: '≈ 7.1 s',
    state: {
      tab: 'memory',
      code: { focus: ['callpal', 'loop'], current: 'sleep' },
      regs: { 'EIP': IN_MAIN, 'EAX': reg('0000000F', 'The last stripe value'), 'EDX': SCRATCH },
      memory: { focus: VRAM_FOCUS('The same bytes as before: 00 01 02 … 0F') },
      terminal: { lines: dump(STRIPE_BYTES) },
      table: OS_TABLE,
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'A function for rectangles',
    summary: 'boxfill fills a rectangle: for every row from y0 to y1, every pixel from x0 ' +
      'to x1 gets the color.',
    detail: 'Pixel (x, y) is byte y × 320 + x, so two nested loops cover a box. Called ' +
      'four times, it clears the screen to black and draws three overlapping squares. A ' +
      'later call simply overwrites the pixels of an earlier one, which is why the blue ' +
      'square sits on top.',
    formula: 'red   (20, 20)–(119, 119)\ngreen (70, 50)–(169, 149)\nblue  (120, 80)–(219, 179)',
    time: '≈ 7.1 s',
    state: {
      tab: 'code',
      graphics: BOXES,
      visual: 'none',
      code: { program: 'day4Boxes', focus: ['boxfill', 'boxpixel', 'clear', 'boxes'], current: 'sleep' },
      regs: { 'EAX': SCRATCH, 'ECX': SCRATCH, 'EDX': SCRATCH },
      memory: { focus: VRAM_FOCUS('Video memory: now holds boxes') },
      terminal: null,
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'A desktop',
    summary: 'Fourteen rectangles make a desktop: a teal background and a gray taskbar ' +
      'with a button and a tray.',
    detail: 'There is no special drawing for buttons. A white line on the top and left ' +
      'edges and dark lines on the bottom and right make a flat box look raised; swapping ' +
      'them makes the tray look sunken. Every position is computed from the screen\'s ' +
      'width and height, so the same code works at other resolutions later.',
    formula: 'background rows 0–171 · taskbar rows 172–199',
    time: '≈ 7.1 s',
    state: {
      graphics: DESKTOP,
      code: { program: 'day4Desktop', focus: ['desktop', 'background', 'taskbar', 'button', 'tray'], current: 'sleep' },
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'What day 4 did',
    summary: 'C code draws on the screen by writing video memory, using 16 colors the OS ' +
      'chose itself.',
    detail: 'Bytes in video memory are color numbers; the palette, set through I/O ports ' +
      '0x03C8 and 0x03C9, turns them into colors; and one rectangle function is enough ' +
      'for a desktop. The screen size and the address of video memory are still written ' +
      'into the code as 320, 200, and 0xA0000. Day 5 reads them from the boot info ' +
      'instead.',
    hint: 'Next, day 5: text, a mouse cursor, and the OS\'s own GDT and IDT.',
    milestone: { label: 'Desktop', text: 'Drawing from C' },
    time: '≈ 7.1 s',
    state: {
      tab: 'memory',
      code: { focus: null },
      memory: { focus: { id: 'vram', note: 'The desktop, one byte per pixel' } },
    },
  },
]);

export const DAY_04 = Object.freeze({
  id: 'day4',
  title: 'Day 4',
  name: 'Drawing from C',
  phases: PHASES,
  steps: STEPS,
});
