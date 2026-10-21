// Day 2: how day 1's assembly turns into its bytes. The machine stays where day 1 left it
// (halted, "hello, world" on screen); each step takes one instruction or idea and takes
// its bytes apart.

import { finalState } from '../../core/state.js';
import { DAY_01 } from './day01.js';

const PHASES = Object.freeze({
  A: 'Assembly and registers',
  B: 'Instruction by instruction',
  C: 'From source to disk',
});

const DAY_1_END = finalState(DAY_01.steps);
const value = (name) => DAY_1_END.regs[name].value;

// The same values as at the end of day 1, described by what each register is for
const ROLE_REGS = {
  'CS':      { value: value('CS'), note: 'Code segment: where instructions are fetched from' },
  'CS base': { value: value('CS base'), note: 'CS × 16' },
  'EIP':     { value: value('EIP'), note: 'Instruction pointer: the next instruction, inside CS' },
  'AX':      { value: value('AX'), note: 'Accumulator. AH is its high byte, AL its low byte' },
  'BX':      { value: value('BX'), note: 'Base register. BH picks the screen page for INT 10h' },
  'SI':      { value: value('SI'), note: 'Source index: lodsb reads the byte at DS:SI' },
  'DS':      { value: value('DS'), note: 'Data segment, used with SI' },
  'SS':      { value: value('SS'), note: 'Stack segment, used with SP' },
  'SP':      { value: value('SP'), note: 'Stack pointer: the top of the stack' },
  'DL':      { value: value('DL'), note: 'Low byte of DX: the drive we booted from' },
};

const focusOn = (start, end, note) => ({
  code: { focus: [start, end] },
  memory: { focus: { id: 'boot_sector', note, bytes: [start, end] } },
});

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'From text to bytes',
    summary: 'Day 1 showed that a program is bytes. Today: how each line of the program ' +
      'becomes those bytes.',
    detail: 'People write programs as text, in assembly language: short words like mov, ' +
      'jmp, and hlt, one instruction per line. A program called an assembler translates ' +
      'each line into the bytes the CPU understands, called machine code. In the code ' +
      'panel, the source is on the right and the bytes it became are on the left.',
    time: '≈ 2.4 s + a few µs',
    state: {
      ...DAY_1_END,
      regs: ROLE_REGS,
      code: { program: 'helloBoot', focus: [0x07C50, 0x07C6C], trace: false },
      memory: { ...DAY_1_END.memory, focus: { id: 'boot_sector', note: 'The program\'s machine code', bytes: [0x07C50, 0x07C6C] } },
      visual: 'none',
      disk: { focus: null },
      tab: 'code',
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Registers: the CPU\'s own storage',
    summary: 'Instructions mostly move numbers in and out of registers, a handful of ' +
      'small storage slots inside the CPU itself.',
    detail: 'Registers are much faster than memory but there are only a few, each with a ' +
      'name and a usual job (see the table below). AX, BX, SI, and SP hold 16 bits; AX ' +
      'can also be used as two 8-bit halves, AH and AL. Segment registers like DS and SS ' +
      'choose which 64 KiB block of memory an address refers to.',
    time: '≈ 2.4 s + a few µs',
    state: {
      code: { focus: null },
      memory: { focus: { id: 'boot_sector', note: 'The program', range: [0x07C50, 0x07C6C] } },
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Labels and org',
    summary: 'Names like msg are labels: the assembler replaces each one with an address.',
    detail: 'org 0x7c00 tells the assembler that the program will sit at {0x7C00}, so it ' +
      'can work out every label\'s address. msg comes 109 bytes into the sector, so it is ' +
      '{0x7C6D}, and mov si, msg is really mov si, 0x7C6D. Without org, the assembler would ' +
      'count from 0 and SI would point at the wrong place.',
    formula: 'org 0x7c00 + 0x6D bytes → msg = {0x7C6D}      mov si, msg → BE 6D 7C',
    time: '≈ 2.4 s + a few µs',
    state: focusOn(0x07C59, 0x07C5B, 'mov si, msg: the label became 6D 7C'),
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'hlt → F4',
    summary: 'The simplest instructions are a single byte.',
    detail: 'hlt needs no extra information, so it is just its operation code (opcode): ' +
      'F4. Every instruction starts with an opcode that tells the CPU what to do; ' +
      'anything after it says what to do it to. cld (FC) and lodsb (AC) are one byte too.',
    formula: 'hlt → F4      cld → FC      lodsb → AC',
    time: '≈ 2.4 s + a few µs',
    state: focusOn(0x07C6A, 0x07C6A, 'hlt is one byte'),
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'int 0x10 → CD 10',
    summary: 'An opcode followed by a number: CD means "interrupt", 10 says which one.',
    detail: 'CD is the opcode for a software interrupt. The byte after it is the interrupt ' +
      'number, copied straight from the source. The CPU uses it to look up the handler ' +
      'in the vector table built on day 0: entry 10h is at 0x10 × 4 = {0x40}.',
    formula: 'CD = int      10 = interrupt number 10h',
    time: '≈ 2.4 s + a few µs',
    state: focusOn(0x07C66, 0x07C67, 'CD 10'),
  },
  {
    id: 'B3',
    phase: 'B',
    title: 'mov ah, 0x0e → B4 0E',
    summary: 'The register is part of the opcode: B0 to B7 each load a different 8-bit ' +
      'register.',
    detail: 'Intel numbers the 8-bit registers AL, CL, DL, BL, AH, CH, DH, BH as 0 to 7. ' +
      '"Load a number into an 8-bit register" is B0 plus the register\'s number, so AH ' +
      '(number 4) gives B4. The value to load, 0E, follows.',
    formula: 'B0 + 4 (AH) = B4      0E = the value',
    time: '≈ 2.4 s + a few µs',
    state: focusOn(0x07C64, 0x07C65, 'B4 0E'),
  },
  {
    id: 'B4',
    phase: 'B',
    title: 'mov sp, 0x7c00 → BC 00 7C',
    summary: 'The same pattern for 16-bit registers: B8 to BF, followed by a 2-byte value ' +
      'stored low byte first.',
    detail: 'The 16-bit registers are numbered AX, CX, DX, BX, SP, BP, SI, DI. SP is number ' +
      '4, so B8 + 4 = BC. The value 0x7C00 takes two bytes, written low byte first: 00 7C. ' +
      'mov si, msg works the same way: SI is number 6, giving BE.',
    formula: 'B8 + 4 (SP) = BC      0x7C00 → 00 7C\nB8 + 6 (SI) = BE      0x7C6D → 6D 7C',
    time: '≈ 2.4 s + a few µs',
    state: focusOn(0x07C56, 0x07C5B, 'BC 00 7C and BE 6D 7C'),
  },
  {
    id: 'B5',
    phase: 'B',
    title: 'xor ax, ax → 31 C0',
    summary: 'When an instruction works on two registers, a second byte names both of ' +
      'them.',
    detail: '31 means "exclusive-or two 16-bit values". The next byte, called ModR/M, is ' +
      'split into bit fields: the top two bits (11) say both operands are registers, the ' +
      'next three name one register, and the last three the other. 000 is AX, so C0 means ' +
      'AX and AX. Any value xor itself is 0, and this is one byte shorter than mov ax, 0.',
    formula: 'C0 = 11 000 000 → registers, AX, AX\nDB = 11 011 011 → registers, BX, BX   (xor bx, bx)',
    time: '≈ 2.4 s + a few µs',
    state: focusOn(0x07C50, 0x07C51, '31 C0'),
  },
  {
    id: 'B6',
    phase: 'B',
    title: 'mov ds, ax → 8E D8',
    summary: 'Segment registers can only be loaded from another register, so the program ' +
      'goes through AX.',
    detail: '8E means "copy into a segment register". In its ModR/M byte the middle three ' +
      'bits pick the segment register (ES, CS, SS, DS are 0 to 3) and the last three the ' +
      'source. There is no instruction to put a number straight into DS, which is why ' +
      'the program first sets AX to 0 and then copies it.',
    formula: 'D8 = 11 011 000 → DS ← AX\nD0 = 11 010 000 → SS ← AX   (mov ss, ax)',
    time: '≈ 2.4 s + a few µs',
    state: focusOn(0x07C52, 0x07C55, '8E D8 and 8E D0'),
  },
  {
    id: 'B7',
    phase: 'B',
    title: 'jz halt → 74 06',
    summary: 'A jump stores a distance, not an address: 06 means "6 bytes ahead".',
    detail: 'The distance counts from the end of the jump instruction, which is where the ' +
      'CPU would go next anyway. jz ("jump if zero") is 74; it only jumps when the last ' +
      'test found zero. The assembler worked out the 6 from where halt is.',
    formula: 'next instruction {0x7C64} + 6 = {0x7C6A} (halt)',
    time: '≈ 2.4 s + a few µs',
    state: focusOn(0x07C62, 0x07C63, '74 06'),
  },
  {
    id: 'B8',
    phase: 'B',
    title: 'jmp print → EB F5',
    summary: 'Jumping backward uses a negative distance: F5 is -11.',
    detail: 'One byte holds 0 to 255, but jumps read it as -128 to 127, so values from 80 ' +
      'up count as negative: F5 (245) means 245 - 256 = -11. Because jumps store ' +
      'distances, this code would still work if the whole program were loaded somewhere ' +
      'else.',
    formula: 'F5 = 245 → 245 − 256 = −11      {0x7C6A} − 11 = {0x7C5F} (print)',
    time: '≈ 2.4 s + a few µs',
    state: focusOn(0x07C68, 0x07C69, 'EB F5'),
  },
  {
    id: 'B9',
    phase: 'B',
    title: 'db, dw, and times: data, not instructions',
    summary: 'Some lines are not instructions at all. They place bytes directly.',
    detail: 'db writes bytes (or text, one byte per letter), dw writes a 2-byte value, dd a ' +
      '4-byte value, always low byte first. times repeats a line, which is how the ' +
      'program pads the sector with zeros. The CPU never runs these bytes; the jump at ' +
      'the start and the loop\'s exit make sure of that.',
    formula: 'dw 512 → 00 02      dd 0xffffffff → FF FF FF FF      db "hi" → 68 69',
    time: '≈ 2.4 s + a few µs',
    state: focusOn(0x07C0B, 0x07C0C, 'dw 512 → 00 02'),
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'From source file to disk',
    summary: 'An assembler turns the text file into exactly 512 bytes, which become the ' +
      'first sector of a disk image.',
    detail: 'The book uses its own assembler, but the steps are the same with any: ' +
      'assemble hello.asm into a 512-byte file, place it at the start of a 1.44 MB image ' +
      '(the rest left empty), and boot the image in an emulator such as QEMU. The BIOS ' +
      'then does exactly what day 0 showed.',
    time: '≈ 2.4 s + a few µs',
    state: {
      code: { focus: [0x07C00, 0x07DFF] },
      memory: { focus: { id: 'boot_sector', note: 'All 512 bytes, from text', range: [0x07C00, 0x07DFF] } },
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'The whole program',
    summary: 'Here is the complete source file, hello.asm. An assembler turns this text ' +
      'into the 512-byte binary.',
    detail: 'So far we took the program apart one line at a time; put together, it is about ' +
      '50 lines of text. The assembler reads the file from top to bottom, works out the ' +
      'address of every label, and writes out each line\'s bytes in order, producing a ' +
      'binary file of exactly 512 bytes. It does for assembly language what a compiler ' +
      'does for languages like C, which the book starts using on day 3.',
    source: 'helloBoot',
    hint: 'Day 3: reading the rest of the floppy and switching to 32-bit mode. Coming soon.',
    milestone: { label: 'Machine code', text: 'Every byte of the boot sector explained' },
    time: '≈ 2.4 s + a few µs',
    state: {},
  },
]);

export const DAY_02 = Object.freeze({
  id: 'day2',
  title: 'Day 2',
  name: 'Machine code',
  phases: PHASES,
  steps: STEPS,
});
