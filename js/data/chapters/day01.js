// Day 1: what is inside the 512-byte boot sector, and running it to print "hello, world".
// Picks up where day 0 ends: the BIOS has loaded the sector to 0x7C00 and jumped there.
// The idea of the day is that a program is nothing but bytes; the instructions themselves
// are explained on day 2.

import { finalState } from '../../core/state.js';
import { programData } from '../programs/assemble.js';
import { HELLO_BOOT } from '../programs/helloBoot.js';
import { DAY_00 } from './day00.js';

const PHASES = Object.freeze({
  A: 'Inside the boot sector',
  B: 'Run it',
});

const DAY_0_END = finalState(DAY_00.steps);
const SCREEN = DAY_0_END.screen;      // the BIOS text, ending with "Booting from Floppy..."
const ROW = SCREEN.length;            // the line the cursor is on
const printed = (text) => [...SCREEN, text];

const UNKNOWN = { value: '????', note: 'Whatever the BIOS left here' };

const START_REGS = {
  'CS':      { value: '0000',     note: 'Code segment 0' },
  'CS base': { value: '00000000', note: 'CS × 16 = 0' },
  'EIP':     { value: '00007C00', note: 'The next instruction: the first byte of the sector' },
  'AX':      UNKNOWN,
  'BX':      UNKNOWN,
  'SI':      UNKNOWN,
  'DS':      UNKNOWN,
  'SS':      UNKNOWN,
  'SP':      UNKNOWN,
  'DL':      { value: '00', note: 'Drive the sector came from: 00 = floppy A:' },
};

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Where day 0 left off',
    summary: 'The BIOS has copied the floppy\'s first sector to {0x7C00} and jumped there. ' +
      'The CPU is about to run whatever those 512 bytes say.',
    detail: 'Today we open those 512 bytes, see what each part is for, and then let the CPU ' +
      'run them. The code panel below the memory shows the same bytes written as text, ' +
      'one line per piece. Tap a line to find its bytes in memory.',
    time: '≈ 2.4 s',
    state: {
      ...DAY_0_END,
      signals: { ...DAY_0_END.signals, bus: false, disk: false },
      regs: START_REGS,
      writes: {
        ...DAY_0_END.writes,
        bootSector: { start: 0x07C00, end: 0x07DFF, data: programData(HELLO_BOOT) },
      },
      memory: { ...DAY_0_END.memory, focus: { id: 'boot_sector', note: 'The 512 bytes we are about to read' } },
      code: { program: 'helloBoot', focus: null },
      tab: 'code',
      visual: 'disk',
      disk: { focus: null },
      cursor: null,
      csip: '0000:7C00',
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'A program is just bytes',
    summary: 'Here are the first 256 bytes of the sector as the CPU sees them: numbers, ' +
      'nothing else.',
    detail: 'Memory cannot tell code from text from numbers. It only holds bytes. A byte ' +
      'becomes an instruction when the CPU reads it while running, and becomes a letter ' +
      'when something prints it. The same holds for every program you have ever used, ' +
      'and for the operating system we are about to build.',
    time: '≈ 2.4 s',
    state: {
      memory: { focus: { id: 'boot_sector', note: 'The start of the boot sector', bytes: [0x07C00, 0x07C00] } },
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Where the bytes come from',
    summary: 'They are the very first sector of a 1.44 MB floppy disk image.',
    detail: 'A floppy is divided into 2,880 sectors of 512 bytes. The first one is the boot ' +
      'sector; next come two copies of the FAT, a table that tracks which parts of the disk ' +
      'files use, then the root directory, then space for file data. Today only the boot ' +
      'sector matters. The rest of our disk is empty.',
    formula: '2,880 sectors × 512 bytes = 1,474,560 bytes = 1.44 MB',
    time: '≈ 2.4 s',
    state: {
      disk: { focus: 'boot' },
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'Part 1: the jump',
    summary: 'The first three bytes, EB 4E 90, tell the CPU to skip ahead to {0x7C50}.',
    detail: 'The next 77 bytes describe the disk, not code, so the CPU must not run them. ' +
      'EB 4E is a short jump: "move forward 0x4E bytes from the end of this instruction". ' +
      '90 is a "do nothing" instruction that fills the third byte, because the disk ' +
      'description is expected to start at byte 3.',
    formula: 'EB 4E → {0x7C02} + 0x4E = {0x7C50}',
    time: '≈ 2.4 s',
    state: {
      code: { focus: [0x07C00, 0x07C02] },
      memory: { focus: { id: 'boot_sector', note: 'Part 1: the jump', bytes: [0x07C00, 0x07C02] } },
    },
  },
  {
    id: 'A4',
    phase: 'A',
    title: 'Part 2: the disk description',
    summary: 'Bytes 3 to 61 describe the disk\'s shape so other systems can read it.',
    detail: 'This block is called the BIOS parameter block (BPB). It says how big a sector ' +
      'is, how many there are, and how they are arranged into tracks and sides. Numbers ' +
      'bigger than one byte are stored low byte first: 512 is 0x0200, written 00 02. The ' +
      'book\'s day 3 code uses these same values to read more of the disk.',
    formula: '00 02 → 0x0200 = 512 bytes per sector      40 0B → 0x0B40 = 2880 sectors',
    time: '≈ 2.4 s',
    state: {
      code: { focus: [0x07C03, 0x07C2A] },
      memory: { focus: { id: 'boot_sector', note: 'Part 2: the disk description', bytes: [0x07C03, 0x07C2A] } },
    },
  },
  {
    id: 'A5',
    phase: 'A',
    title: 'Text is bytes too',
    summary: 'The volume label and file system type are stored as letters: one byte each.',
    detail: 'Computers store letters as numbers using a table called ASCII: "O" is 0x4F, ' +
      '"S" is 0x53, "-" is 0x2D. The 11 bytes at {0x7C2B} spell OS-TUTORIAL, and the 8 at ' +
      '{0x7C36} spell FAT12 followed by three spaces (0x20), padding the name to its fixed ' +
      'size.',
    formula: '4F 53 2D 54 55 54 4F 52 49 41 4C = O S - T U T O R I A L',
    time: '≈ 2.4 s',
    state: {
      code: { focus: [0x07C2B, 0x07C3D] },
      memory: { focus: { id: 'boot_sector', note: 'Letters stored as ASCII', bytes: [0x07C2B, 0x07C3D] } },
    },
  },
  {
    id: 'A6',
    phase: 'A',
    title: 'Part 3: the program',
    summary: 'From {0x7C50}, 29 bytes of real instructions, followed by the message.',
    detail: 'In plain words, the program says: get ready; take the next letter of the ' +
      'message; if it is the end marker, stop; otherwise ask the BIOS to print it and go ' +
      'back for the next one. Each line in the code panel is one instruction, between one ' +
      'and three bytes long. Day 2 explains how each instruction turns into its bytes.',
    time: '≈ 2.4 s',
    state: {
      code: { focus: [0x07C50, 0x07C6C] },
      memory: { focus: { id: 'boot_sector', note: 'Part 3: the program', bytes: [0x07C50, 0x07C6C] } },
    },
  },
  {
    id: 'A7',
    phase: 'A',
    title: 'The message',
    summary: '"hello, world" sits right after the code at {0x7C6D}, one byte per letter.',
    detail: 'After the 12 letters come 0D and 0A, the characters for "go to the start of the ' +
      'line" and "go down one line", and then a single 00. That zero is how the program ' +
      'knows where the message ends.',
    formula: '68 65 6C 6C 6F 2C 20 77 6F 72 6C 64 = h e l l o , ␣ w o r l d',
    time: '≈ 2.4 s',
    state: {
      code: { focus: [0x07C6D, 0x07C7B] },
      memory: { focus: { id: 'boot_sector', note: 'The message', bytes: [0x07C6D, 0x07C7B] } },
    },
  },
  {
    id: 'A8',
    phase: 'A',
    title: 'Part 4: padding and the signature',
    summary: 'Zeros fill the sector up to byte 510, and the last two bytes are 55 AA.',
    detail: 'The program and message use only 124 bytes, but a sector is always 512, so ' +
      'the rest is filled with zeros. The 55 AA at {0x7DFE} is the boot signature the BIOS ' +
      'checked on day 0.',
    formula: '{0x7C7C} to {0x7DFD}: 386 zeros      {0x7DFE}: 55 AA',
    time: '≈ 2.4 s',
    state: {
      code: { focus: [0x07C7C, 0x07DFF] },
      memory: { focus: { id: 'boot_sector', note: 'The boot signature', bytes: [0x07DFE, 0x07DFF] } },
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'Run: the jump',
    summary: 'Now the CPU starts running. Its first instruction is the jump over the disk ' +
      'description.',
    detail: 'EIP goes from 7C00 to 7C50. Everything from now on happens in a few ' +
      'microseconds; we slow it down to one step at a time.',
    time: '≈ 2.4 s',
    state: {
      regs: { 'EIP': { value: '00007C50', note: 'Now at the first real instruction' } },
      code: { focus: null },
      memory: { focus: { id: 'boot_sector', note: 'The CPU continues here', bytes: [0x07C50, 0x07C50] } },
      disk: { focus: null },
      csip: '0000:7C50',
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Get ready',
    summary: 'Seven instructions set up the registers the rest of the program relies on.',
    detail: 'The BIOS makes no promises about most registers, so the program sets them ' +
      'itself. DS and SS become 0, so addresses mean what they say. SP, the stack pointer, ' +
      'starts at {0x7C00} and grows downward into free memory below the sector. SI now ' +
      'points at the message, and BX is cleared.',
    time: '≈ 2.4 s + a few µs',
    state: {
      regs: {
        'EIP': { value: '00007C5F', note: 'At the start of the print loop' },
        'AX':  { value: '0000', note: 'Cleared by xor ax, ax' },
        'BX':  { value: '0000', note: 'Cleared by xor bx, bx' },
        'SI':  { value: '7C6D', note: 'Points at the message' },
        'DS':  { value: '0000', note: 'Data segment' },
        'SS':  { value: '0000', note: 'Stack segment' },
        'SP':  { value: '7C00', note: 'Top of the stack' },
      },
      code: { focus: [0x07C50, 0x07C5E] },
      memory: { focus: { id: 'boot_sector', note: 'SI points at the message', bytes: [0x07C6D, 0x07C6D] } },
      csip: '0000:7C5F',
    },
  },
  {
    id: 'B3',
    phase: 'B',
    title: 'Print the first letter',
    summary: 'The loop takes "h" (0x68) from the message and asks the BIOS to print it.',
    detail: 'lodsb copies the byte at SI into AL and moves SI on by one. It is not zero, so ' +
      'the program puts 0E in AH (the BIOS\'s "print a character" function) and calls INT ' +
      '10h. The CPU looks up vector 10h at {0x40} and runs the video BIOS, which writes the ' +
      'letter into video memory at the cursor. An "h" appears on screen.',
    time: '≈ 2.4 s + a few µs',
    state: {
      regs: {
        'EIP': { value: '00007C68', note: 'Back from INT 10h, at jmp print' },
        'AX':  { value: '0E68', note: 'AH = 0E (print), AL = 68 ("h")' },
        'SI':  { value: '7C6E', note: 'Moved on to the next letter' },
      },
      code: { focus: [0x07C5F, 0x07C67] },
      memory: { focus: { id: 'boot_sector', note: '"h" is the byte at 0x7C6D', bytes: [0x07C6D, 0x07C6D] } },
      screen: printed('h'),
      cursor: [ROW, 1],
      csip: '0000:7C68',
    },
  },
  {
    id: 'B4',
    phase: 'B',
    title: 'Around the loop',
    summary: 'jmp print sends the CPU back to lodsb, and "e" comes out the same way.',
    detail: 'EB F5 is a jump backward: F5 is -11, so the CPU goes back 11 bytes, to the ' +
      'start of the loop. The same five instructions run again for each letter, with SI ' +
      'one byte further along every time.',
    formula: 'EB F5 → {0x7C6A} − 11 = {0x7C5F}',
    time: '≈ 2.4 s + a few µs',
    state: {
      regs: {
        'AX': { value: '0E65', note: 'AL = 65 ("e")' },
        'SI': { value: '7C6F', note: 'One letter further' },
      },
      code: { focus: [0x07C68, 0x07C69] },
      memory: { focus: { id: 'boot_sector', note: '"e" is next', bytes: [0x07C6E, 0x07C6E] } },
      screen: printed('he'),
      cursor: [ROW, 2],
    },
  },
  {
    id: 'B5',
    phase: 'B',
    title: 'The whole message',
    summary: 'Ten more times around the loop, and "hello, world" is on the screen.',
    detail: 'Every letter you see is also two bytes in video memory: the character and its ' +
      'color, just like the BIOS text above it. Tap the video memory row in the memory ' +
      'panel to find them.',
    time: '≈ 2.4 s + a few µs',
    state: {
      regs: {
        'AX': { value: '0E64', note: 'AL = 64 ("d"), the last letter' },
        'SI': { value: '7C79', note: 'Past the last letter' },
      },
      code: { focus: [0x07C5F, 0x07C69] },
      memory: { focus: { id: 'boot_sector', note: 'All 12 letters printed', bytes: [0x07C6D, 0x07C78] } },
      screen: printed('hello, world'),
      cursor: [ROW, 12],
    },
  },
  {
    id: 'B6',
    phase: 'B',
    title: 'The end of the message',
    summary: 'After the new-line characters, lodsb reads the 00 and the loop stops.',
    detail: '0D and 0A print like letters but move the cursor to the start of the next line. ' +
      'Then AL is 0, test al, al sees it, and jz ("jump if zero") leaves the loop for halt.',
    time: '≈ 2.4 s + a few µs',
    state: {
      regs: {
        'EIP': { value: '00007C6A', note: 'At hlt' },
        'AX':  { value: '0E00', note: 'AL = 00: the end marker' },
        'SI':  { value: '7C7C', note: 'Just past the end marker' },
      },
      code: { focus: [0x07C60, 0x07C63] },
      memory: { focus: { id: 'boot_sector', note: 'The 00 that ends the message', bytes: [0x07C7B, 0x07C7B] } },
      screen: [...printed('hello, world'), ''],
      cursor: null,
      csip: '0000:7C6A',
    },
  },
  {
    id: 'B7',
    phase: 'B',
    title: 'Halt',
    summary: 'hlt puts the CPU to sleep. Our first program is done.',
    detail: 'A halted CPU wakes up at the next interrupt, such as the timer that ticks 18.2 ' +
      'times a second. jmp halt sends it straight back to sleep, so the machine sits here, ' +
      'quiet, with "hello, world" on the screen. Everything you saw happen came from the 512 ' +
      'bytes we read earlier.',
    hint: 'Day 2: how each instruction becomes its bytes.',
    milestone: { label: 'Hello', text: 'Our own code prints on the screen' },
    time: '≈ 2.4 s + a few µs',
    state: {
      regs: { 'EIP': { value: '00007C6B', note: 'Asleep; wakes up at jmp halt' } },
      code: { focus: [0x07C6A, 0x07C6C] },
      memory: { focus: { id: 'boot_sector', note: 'The CPU sleeps here', bytes: [0x07C6A, 0x07C6C] } },
      csip: '0000:7C6B',
    },
  },
]);

export const DAY_01 = Object.freeze({
  id: 'day1',
  title: 'Day 1',
  name: 'Hello, world',
  phases: PHASES,
  steps: STEPS,
});
