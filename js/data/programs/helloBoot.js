import { assemble, db, dw, dd } from './assemble.js';

// Day 1's boot sector: a FAT12 disk description, then a small program that prints
// "hello, world" through the BIOS and halts. Written for this site; the layout (jump,
// BPB, code at 0x7C50, 55 AA at the end) follows the PC and FAT12 standards the book
// also uses.
const LINES = [
  { source: 'org 0x7c00', bytes: [], comment: 'The BIOS loads this sector at 0x7C00' },
  { source: 'jmp short entry', bytes: [0xEB, 0x4E], comment: 'Jump over the disk description to the code' },
  { source: 'nop', bytes: [0x90], comment: 'Filler, so the description starts at byte 3' },

  { heading: 'Disk description (BIOS parameter block) for a 1.44 MB floppy' },
  { source: 'db "TUTORIPL"', bytes: db('TUTORIPL'), comment: 'Name of the tool that formatted the disk (8 bytes)' },
  { source: 'dw 512', bytes: dw(512), comment: 'Bytes per sector' },
  { source: 'db 1', bytes: db(1), comment: 'Sectors per cluster' },
  { source: 'dw 1', bytes: dw(1), comment: 'Reserved sectors: just this boot sector' },
  { source: 'db 2', bytes: db(2), comment: 'Number of FATs (file allocation tables)' },
  { source: 'dw 224', bytes: dw(224), comment: 'Root directory entries' },
  { source: 'dw 2880', bytes: dw(2880), comment: 'Total sectors: 2880 × 512 = 1.44 MB' },
  { source: 'db 0xf0', bytes: db(0xF0), comment: 'Media type: 3.5" floppy' },
  { source: 'dw 9', bytes: dw(9), comment: 'Sectors per FAT' },
  { source: 'dw 18', bytes: dw(18), comment: 'Sectors per track' },
  { source: 'dw 2', bytes: dw(2), comment: 'Heads (one per side)' },
  { source: 'dd 0', bytes: dd(0), comment: 'Hidden sectors before this one' },
  { source: 'dd 0', bytes: dd(0), comment: 'Total sectors, 32-bit (0: use the 16-bit count)' },
  { source: 'db 0', bytes: db(0), comment: 'Drive number' },
  { source: 'db 0', bytes: db(0), comment: 'Reserved' },
  { source: 'db 0x29', bytes: db(0x29), comment: 'Marks that the next three fields are present' },
  { source: 'dd 0xffffffff', bytes: dd(0xFFFFFFFF), comment: 'Volume serial number' },
  { source: 'db "OS-TUTORIAL"', bytes: db('OS-TUTORIAL'), comment: 'Volume label (11 bytes)' },
  { source: 'db "FAT12   "', bytes: db('FAT12   '), comment: 'File system type (8 bytes)' },
  { source: 'times 18 db 0', bytes: new Array(18).fill(0), comment: 'Unused, so the code starts at 0x7C50' },

  { label: 'entry' },
  { source: 'xor ax, ax', bytes: [0x31, 0xC0], comment: 'AX = 0' },
  { source: 'mov ds, ax', bytes: [0x8E, 0xD8], comment: 'Data segment = 0' },
  { source: 'mov ss, ax', bytes: [0x8E, 0xD0], comment: 'Stack segment = 0' },
  { source: 'mov sp, 0x7c00', bytes: [0xBC, 0x00, 0x7C], comment: 'Stack grows down from just below this sector' },
  { source: 'mov si, msg', bytes: [0xBE, 0x6D, 0x7C], comment: 'SI = address of the message' },
  { source: 'cld', bytes: [0xFC], comment: 'Make lodsb step forward through memory' },
  { source: 'xor bx, bx', bytes: [0x31, 0xDB], comment: 'BH = 0: print on screen page 0' },
  { label: 'print' },
  { source: 'lodsb', bytes: [0xAC], comment: 'AL = the byte at SI, then SI = SI + 1' },
  { source: 'test al, al', bytes: [0x84, 0xC0], comment: 'Is it the 0 that ends the message?' },
  { source: 'jz halt', bytes: [0x74, 0x06], comment: 'If so, stop printing' },
  { source: 'mov ah, 0x0e', bytes: [0xB4, 0x0E], comment: 'BIOS function 0Eh: print one character' },
  { source: 'int 0x10', bytes: [0xCD, 0x10], comment: 'Ask the video BIOS to print AL' },
  { source: 'jmp print', bytes: [0xEB, 0xF5], comment: 'Back for the next character' },
  { label: 'halt' },
  { source: 'hlt', bytes: [0xF4], comment: 'Sleep until the next interrupt' },
  { source: 'jmp halt', bytes: [0xEB, 0xFD], comment: 'Then go back to sleep' },
  { label: 'msg' },
  { source: 'db "hello, world", 13, 10, 0', bytes: db('hello, world', 13, 10, 0), comment: 'The text, a new line, and a 0 to mark the end' },

  { heading: 'Pad the sector to 512 bytes and end it with the boot signature' },
  { source: 'times 510-($-$$) db 0', fillTo: 0x7DFE, comment: 'Zeros up to byte 510 of the sector' },
  { source: 'db 0x55, 0xaa', bytes: [0x55, 0xAA], comment: 'Boot signature' },
];

export const HELLO_BOOT = Object.freeze({
  name: 'hello.asm',
  ...assemble(0x7C00, LINES),
});

// The jumps and mov si above use fixed offsets; make sure the layout still matches them
const { labels, size } = HELLO_BOOT;
console.assert(labels.entry === 0x7C50, 'entry must be at 0x7C50 for jmp short entry');
console.assert(labels.print === 0x7C5F && labels.halt === 0x7C6A, 'jump targets moved');
console.assert(labels.msg === 0x7C6D, 'msg must be at 0x7C6D for mov si, msg');
console.assert(size === 512, 'the boot sector must be exactly 512 bytes');
