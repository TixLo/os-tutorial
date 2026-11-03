// Day 4's programs: the first C code that draws. Simplified teaching code written for
// this site; lines share a tag so a step can highlight them.

// Small assembly helpers C calls for what it cannot say itself: special instructions
// (hlt, cli, in/out) and, at first, writing to an address.
export const ASM_FUNCS = Object.freeze({
  name: 'asmfunc.asm',
  illustrative: true,
  lines: [
    { source: 'bits 32', comment: 'Called from 32-bit C code' },

    { heading: 'void io_hlt(void): sleep until an interrupt' },
    { label: 'io_hlt' },
    { source: 'hlt', bytes: [0xF4], tag: 'hlt' },
    { source: 'ret', bytes: [0xC3], tag: 'hlt' },

    { heading: 'void write_mem8(int addr, int data): one byte to any address' },
    { label: 'write_mem8' },
    { source: 'mov ecx, [esp+4]', bytes: [0x8B, 0x4C, 0x24, 0x04], comment: 'First argument: the address', tag: 'write' },
    { source: 'mov al, [esp+8]', bytes: [0x8A, 0x44, 0x24, 0x08], comment: 'Second argument: the byte', tag: 'write' },
    { source: 'mov [ecx], al', bytes: [0x88, 0x01], comment: 'Store it', tag: 'write' },
    { source: 'ret', bytes: [0xC3], tag: 'write' },

    { heading: 'Interrupt flag and I/O ports' },
    { label: 'io_cli' },
    { source: 'cli', bytes: [0xFA], comment: 'Interrupts off', tag: 'cli' },
    { source: 'ret', bytes: [0xC3], tag: 'cli' },
    { label: 'io_out8' },
    { source: 'mov edx, [esp+4]', bytes: [0x8B, 0x54, 0x24, 0x04], comment: 'Port number', tag: 'out' },
    { source: 'mov al, [esp+8]', bytes: [0x8A, 0x44, 0x24, 0x08], comment: 'Byte to send', tag: 'out' },
    { source: 'out dx, al', bytes: [0xEE], tag: 'out' },
    { source: 'ret', bytes: [0xC3], tag: 'out' },
    { label: 'io_load_eflags' },
    { source: 'pushfd', bytes: [0x9C], comment: 'Copy EFLAGS onto the stack', tag: 'flags' },
    { source: 'pop eax', bytes: [0x58], comment: 'and into EAX, the return value', tag: 'flags' },
    { source: 'ret', bytes: [0xC3], tag: 'flags' },
    { label: 'io_store_eflags' },
    { source: 'mov eax, [esp+4]', bytes: [0x8B, 0x44, 0x24, 0x04], tag: 'flags' },
    { source: 'push eax', bytes: [0x50], tag: 'flags' },
    { source: 'popfd', bytes: [0x9D], comment: 'Put EFLAGS back, interrupt flag included', tag: 'flags' },
    { source: 'ret', bytes: [0xC3], tag: 'flags' },
  ],
});

const PROTOTYPES = [
  { source: 'void io_hlt(void);', comment: 'In asmfunc.asm', tag: 'proto' },
  { source: 'void write_mem8(int addr, int data);', tag: 'proto' },
];

const SLEEP_FOREVER = [
  { source: '    for (;;) {', tag: 'sleep' },
  { source: '        io_hlt();', comment: 'Done: sleep', tag: 'sleep' },
  { source: '    }', tag: 'sleep' },
  { source: '}' },
];

// Fill the screen with color 15, one call per byte
export const DAY4_WHITE = Object.freeze({
  name: 'kernel.c',
  illustrative: true,
  lines: [
    ...PROTOTYPES,
    { source: '' },
    { source: 'void kernel_main(void)', tag: 'main' },
    { source: '{', tag: 'main' },
    { source: '    int i;', tag: 'main' },
    { source: '    for (i = 0xa0000; i < 0xa0000 + 320 * 200; i++) {', comment: 'Every byte of the screen', tag: 'loop' },
    { source: '        write_mem8(i, 15);', comment: 'Color number 15', tag: 'loop' },
    { source: '    }', tag: 'loop' },
    ...SLEEP_FOREVER,
  ],
});

// The same loop, with a color that changes with the address
export const DAY4_STRIPES = Object.freeze({
  name: 'kernel.c',
  illustrative: true,
  lines: [
    ...PROTOTYPES,
    { source: '' },
    { source: 'void kernel_main(void)', tag: 'main' },
    { source: '{', tag: 'main' },
    { source: '    int i;', tag: 'main' },
    { source: '    for (i = 0xa0000; i < 0xa0000 + 320 * 200; i++) {', tag: 'loop' },
    { source: '        write_mem8(i, i & 0x0f);', comment: 'Color = the address\'s lowest 4 bits', tag: 'pattern' },
    { source: '    }', tag: 'loop' },
    ...SLEEP_FOREVER,
  ],
});

// No helper: a pointer lets C write to the address itself
export const DAY4_POINTER = Object.freeze({
  name: 'kernel.c',
  illustrative: true,
  lines: [
    { source: 'void io_hlt(void);', tag: 'proto' },
    { source: '' },
    { source: 'void kernel_main(void)', tag: 'main' },
    { source: '{', tag: 'main' },
    { source: '    int i;', tag: 'main' },
    { source: '    char *vram = (char *) 0xa0000;', comment: 'A pointer: holds an address', tag: 'pointer' },
    { source: '    for (i = 0; i < 320 * 200; i++) {', comment: 'Now i counts pixels, not addresses', tag: 'loop' },
    { source: '        vram[i] = i & 0x0f;', comment: 'The byte at vram + i', tag: 'store' },
    { source: '    }', tag: 'loop' },
    ...SLEEP_FOREVER,
  ],
});

// The kernel sets its own 16 colors, then draws boxes and a desktop
const PALETTE_CODE = [
  { heading: 'The 16 colors, 3 bytes each: red, green, blue' },
  { source: 'static unsigned char colors[16 * 3] = {', tag: 'table' },
  { source: '    0x00, 0x00, 0x00,', comment: ' 0: black', tag: 'table' },
  { source: '    0xff, 0x00, 0x00,', comment: ' 1: red', tag: 'table' },
  { source: '    0x00, 0xff, 0x00,', comment: ' 2: green', tag: 'table' },
  { source: '    /* ... colors 3 to 13 ... */', tag: 'table' },
  { source: '    0x00, 0x84, 0x84,', comment: '14: teal', tag: 'table' },
  { source: '    0x84, 0x84, 0x84', comment: '15: dark gray', tag: 'table' },
  { source: '};', tag: 'table' },
  { source: '' },
  { source: 'void set_palette(int first, int last, unsigned char *rgb)', tag: 'setpal' },
  { source: '{', tag: 'setpal' },
  { source: '    int i;', tag: 'setpal' },
  { source: '    int eflags = io_load_eflags();', comment: 'Remember the interrupt flag', tag: 'guard' },
  { source: '    io_cli();', comment: 'No interrupts while we talk to the card', tag: 'guard' },
  { source: '    io_out8(0x03c8, first);', comment: 'Index port: start at this color', tag: 'index' },
  { source: '    for (i = first; i <= last; i++) {', tag: 'data' },
  { source: '        io_out8(0x03c9, rgb[0] / 4);', comment: 'Data port: red, 6 bits', tag: 'data' },
  { source: '        io_out8(0x03c9, rgb[1] / 4);', comment: 'green', tag: 'data' },
  { source: '        io_out8(0x03c9, rgb[2] / 4);', comment: 'blue; the card moves to the next color', tag: 'data' },
  { source: '        rgb += 3;', tag: 'data' },
  { source: '    }', tag: 'data' },
  { source: '    io_store_eflags(eflags);', comment: 'Interrupt flag back as it was', tag: 'guard' },
  { source: '}', tag: 'setpal' },
];

const BOXFILL = [
  { source: '' },
  { source: 'void boxfill(char *vram, int width, char color,', tag: 'boxfill' },
  { source: '             int x0, int y0, int x1, int y1)', tag: 'boxfill' },
  { source: '{', tag: 'boxfill' },
  { source: '    int x, y;', tag: 'boxfill' },
  { source: '    for (y = y0; y <= y1; y++) {', comment: 'Each row of the box', tag: 'boxfill' },
  { source: '        for (x = x0; x <= x1; x++) {', comment: 'Each pixel of the row', tag: 'boxfill' },
  { source: '            vram[y * width + x] = color;', comment: 'Row y starts at y × width', tag: 'boxpixel' },
  { source: '        }', tag: 'boxfill' },
  { source: '    }', tag: 'boxfill' },
  { source: '}', tag: 'boxfill' },
];

export const DAY4_PALETTE = Object.freeze({
  name: 'kernel.c',
  illustrative: true,
  lines: [
    { source: '/* io_hlt, io_cli, io_out8, io_load_eflags, io_store_eflags: asmfunc.asm */', tag: 'proto' },
    ...PALETTE_CODE,
    { source: '' },
    { source: 'void kernel_main(void)', tag: 'main' },
    { source: '{', tag: 'main' },
    { source: '    int i;', tag: 'main' },
    { source: '    char *vram = (char *) 0xa0000;', tag: 'main' },
    { source: '    set_palette(0, 15, colors);', comment: 'First: our own colors', tag: 'callpal' },
    { source: '    for (i = 0; i < 320 * 200; i++) {', tag: 'loop' },
    { source: '        vram[i] = i & 0x0f;', comment: 'Then the same stripes as before', tag: 'loop' },
    { source: '    }', tag: 'loop' },
    ...SLEEP_FOREVER,
  ],
});

export const DAY4_BOXES = Object.freeze({
  name: 'kernel.c',
  illustrative: true,
  lines: [
    { source: '/* set_palette and colors[] as before */', tag: 'proto' },
    { source: 'enum { BLACK, RED, GREEN, YELLOW, BLUE, /* ... */ TEAL = 14, DARK_GRAY };', comment: 'Names for color numbers', tag: 'names' },
    ...BOXFILL,
    { source: '' },
    { source: 'void kernel_main(void)', tag: 'main' },
    { source: '{', tag: 'main' },
    { source: '    char *vram = (char *) 0xa0000;', tag: 'main' },
    { source: '    set_palette(0, 15, colors);', tag: 'main' },
    { source: '    boxfill(vram, 320, BLACK, 0, 0, 319, 199);', comment: 'Clear the screen', tag: 'clear' },
    { source: '    boxfill(vram, 320, RED, 20, 20, 119, 119);', tag: 'boxes' },
    { source: '    boxfill(vram, 320, GREEN, 70, 50, 169, 149);', tag: 'boxes' },
    { source: '    boxfill(vram, 320, BLUE, 120, 80, 219, 179);', tag: 'boxes' },
    ...SLEEP_FOREVER,
  ],
});

export const DAY4_DESKTOP = Object.freeze({
  name: 'kernel.c',
  illustrative: true,
  lines: [
    { source: '/* set_palette, colors[], color names, and boxfill as before */', tag: 'proto' },
    { source: '' },
    { source: 'void draw_desktop(char *vram, int w, int h)', tag: 'desktop' },
    { source: '{', tag: 'desktop' },
    { source: '    boxfill(vram, w, TEAL,       0, 0,      w - 1, h - 29);', comment: 'Background', tag: 'background' },
    { source: '    boxfill(vram, w, LIGHT_GRAY, 0, h - 28, w - 1, h - 28);', comment: 'Taskbar: top edge', tag: 'taskbar' },
    { source: '    boxfill(vram, w, WHITE,      0, h - 27, w - 1, h - 27);', comment: 'a light line', tag: 'taskbar' },
    { source: '    boxfill(vram, w, LIGHT_GRAY, 0, h - 26, w - 1, h - 1);', comment: 'its face', tag: 'taskbar' },
    { source: '    /* Start button: light top and left edges, dark bottom and right */', tag: 'button' },
    { source: '    boxfill(vram, w, WHITE,      4,  h - 24, 56, h - 24);', tag: 'button' },
    { source: '    boxfill(vram, w, WHITE,      3,  h - 24, 3,  h - 4);', tag: 'button' },
    { source: '    boxfill(vram, w, DARK_GRAY,  4,  h - 4,  56, h - 4);', tag: 'button' },
    { source: '    boxfill(vram, w, DARK_GRAY,  56, h - 23, 56, h - 5);', tag: 'button' },
    { source: '    boxfill(vram, w, BLACK,      3,  h - 3,  57, h - 3);', tag: 'button' },
    { source: '    boxfill(vram, w, BLACK,      57, h - 24, 57, h - 3);', tag: 'button' },
    { source: '    /* Tray on the right: dark top and left, light bottom and right */', tag: 'tray' },
    { source: '    boxfill(vram, w, DARK_GRAY,  w - 46, h - 24, w - 4,  h - 24);', tag: 'tray' },
    { source: '    boxfill(vram, w, DARK_GRAY,  w - 46, h - 23, w - 46, h - 4);', tag: 'tray' },
    { source: '    boxfill(vram, w, WHITE,      w - 46, h - 3,  w - 4,  h - 3);', tag: 'tray' },
    { source: '    boxfill(vram, w, WHITE,      w - 3,  h - 24, w - 3,  h - 3);', tag: 'tray' },
    { source: '}', tag: 'desktop' },
    { source: '' },
    { source: 'void kernel_main(void)', tag: 'main' },
    { source: '{', tag: 'main' },
    { source: '    set_palette(0, 15, colors);', tag: 'main' },
    { source: '    draw_desktop((char *) 0xa0000, 320, 200);', tag: 'calldesk' },
    ...SLEEP_FOREVER,
  ],
});
