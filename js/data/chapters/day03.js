// Day 3: the boot sector becomes a loader. It reads the first 10 cylinders of the floppy
// into memory and jumps to the kernel, which switches the screen to graphics mode, moves
// the CPU into 32-bit protected mode, and calls the first C function.
// The programs are simplified teaching code (see js/data/programs/ipl.js and kernel.js);
// the disk read loop is walked through once and then summarized.

import { finalState } from '../../core/state.js';
import { HELLO_BOOT } from '../programs/helloBoot.js';
import { DAY_00 } from './day00.js';

const PHASES = Object.freeze({
  A: 'Read the floppy',
  B: 'Switch the screen',
  C: 'Protected mode and C',
});

const DAY_0_END = finalState(DAY_00.steps);

// The new boot sector: same jump and disk description as day 1, new code (not shown
// byte by byte), same signature
const BOOT_HEADER = HELLO_BOOT.lines
  .filter((line) => line.bytes && line.bytes.length && line.address < 0x07C50)
  .map((line) => [line.address, line.bytes]);
const IPL_SECTOR = {
  start: 0x07C00, end: 0x07DFF,
  data: [...BOOT_HEADER, [0x07DFE, [0x55, 0xAA]]],
};

// Everything the loader has read so far, from 0x8200 up to `end`
const loaded = (end) => ({ start: 0x08200, end, data: [] });
const LOADED_END = 0x34FFF;   // 0x8000 + 10 cylinders × 2 heads × 18 sectors × 512 bytes - 1

// Boot info the kernel leaves at 0x0FF0 for the C code
const bootInfo = (leds) => ({
  start: 0x00FF0, end: 0x00FFB,
  data: [[0x00FF0, [0x0A, leds, 0x08, 0x00, 0x40, 0x01, 0xC8, 0x00, 0x00, 0x00, 0x0A, 0x00]]],
});

const reg = (value, note) => ({ value, note });
const UNKNOWN = reg('????', 'Whatever the BIOS left here');

const START_REGS = {
  'CS':      reg('0000', 'Code segment 0'),
  'CS base': reg('00000000', 'CS × 16 = 0'),
  'EIP':     reg('00007C00', 'The first byte of the boot sector'),
  'AX':      UNKNOWN,
  'BX':      UNKNOWN,
  'CX':      UNKNOWN,
  'DX':      reg('??00', 'DL = 00: booted from floppy A:'),
  'SI':      UNKNOWN,
  'DS':      UNKNOWN,
  'ES':      UNKNOWN,
  'SS':      UNKNOWN,
  'SP':      UNKNOWN,
  'EFLAGS':  reg('00000202', 'IF = 1: interrupts are on'),
  'CR0':     reg('00000010', 'PE = 0: real mode'),
  'GDTR':    reg('—', 'No segment table yet'),
};

const IPL_EIP = reg('00007C··', 'Somewhere in the loader');
const KERNEL_EIP = reg('0000C2··', 'Somewhere in the kernel\'s start');

const STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'A new boot sector',
    summary: 'Today\'s floppy has a different boot sector: instead of printing a message, ' +
      'it loads the rest of the operating system.',
    detail: 'The BIOS did the same job as on day 0 and jumped to {0x7C00}. The jump, the ' +
      'disk description, and 55 AA are the same as day 1; only the code in the middle is ' +
      'new. A program like this is called an initial program loader, or IPL. From today ' +
      'the code on this site is simplified for teaching: the structure and BIOS calls are ' +
      'real, but only some lines show their bytes.',
    time: '≈ 2.4 s',
    state: {
      ...DAY_0_END,
      signals: { ...DAY_0_END.signals, bus: false, disk: false },
      regs: START_REGS,
      writes: { ...DAY_0_END.writes, bootSector: IPL_SECTOR },
      memory: { ...DAY_0_END.memory, focus: { id: 'boot_sector', note: 'The new boot sector: an IPL' } },
      code: { program: 'ipl', focus: null, current: 'setup', trace: true },
      tab: 'code',
      visual: 'disk',
      disk: { focus: 'boot', note: null },
      gdt: { focus: null },
      cursor: null,
      csip: '0000:7C00',
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Why 512 bytes are not enough',
    summary: 'An operating system is far bigger than one sector, so the rest of it is ' +
      'stored further along the disk.',
    detail: 'The BIOS only ever loads sector 1. Everything else is up to that sector\'s ' +
      'code. Our kernel is a file, kernel.sys, which the disk\'s file system places at the ' +
      'start of the file data area, sector 34. The loader\'s job is to copy that part of ' +
      'the disk into memory.',
    time: '≈ 2.4 s',
    state: {
      disk: { focus: 'kernel', note: ['kernel.sys starts at sector 34,', 'byte 0x4200 of the disk image'] },
      code: { focus: null },
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'The plan: copy 10 cylinders',
    summary: 'The loader copies the first 10 cylinders of the disk, 180 KiB, to memory ' +
      'starting at {0x8000}.',
    detail: 'Copying a whole range is simpler than finding one file, and 10 cylinders ' +
      'easily hold the kernel. The disk image is laid out so that byte n of the disk ends ' +
      'up at {0x8000} + n. Sector 1 is already at {0x7C00}, so reading starts with sector 2, ' +
      'which lands at {0x8200}.',
    formula: '10 cylinders × 2 heads × 18 sectors × 512 bytes = 184,320 bytes (0x2D000)\n' +
      '{0x8000} + 0x2D000 = {0x35000}, so the copy fills {0x8200}–{0x34FFF}',
    time: '≈ 2.4 s',
    state: {
      tab: 'memory',
      code: { focus: ['cyls'] },
      memory: { focus: { id: 'free_high', note: 'Where the disk will be copied', range: [0x08200, LOADED_END] } },
      disk: { focus: 'read', note: ['Cylinders 0–9: sectors 1–360', '→ copied to 0x8000 onward'] },
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'Ask the BIOS for one sector',
    summary: 'INT 13h function 02h reads sectors. Registers say which sector and where to ' +
      'put it.',
    detail: 'AH = 02 means "read", AL = how many sectors. CH, DH, and CL pick the cylinder, ' +
      'head, and sector: here 0, 0, 2. DL is the drive, 00 for A:. ES:BX is where the data ' +
      'goes: ES = 0x0820 and BX = 0 give 0x0820 × 16 = {0x8200}. These are the same ' +
      'mov-register-number instructions as day 2: B5 is CH, B6 DH, B1 CL.',
    formula: 'ES:BX = 0x0820:0000 → 0x0820 × 16 + 0 = {0x8200}',
    time: '≈ 2.4 s',
    state: {
      tab: 'code',
      regs: {
        'EIP': IPL_EIP,
        'AX': reg('0201', 'AH = 02 (read), AL = 01 (one sector)'),
        'BX': reg('0000', 'Offset 0'),
        'CX': reg('0002', 'CH = 00 (cylinder 0), CL = 02 (sector 2)'),
        'DX': reg('0000', 'DH = 00 (head 0), DL = 00 (drive A:)'),
        'SI': reg('0000', 'Failed attempts so far'),
        'DS': reg('0000', 'Data segment'),
        'ES': reg('0820', 'Destination segment: 0x0820 × 16 = 0x8200'),
        'SS': reg('0000', 'Stack segment'),
        'SP': reg('7C00', 'Stack top'),
      },
      code: { focus: ['dest', 'chs', 'call'], current: 'call' },
      memory: { focus: { id: 'free_high', note: 'ES:BX points here', bytes: [0x08200, 0x08200] } },
      disk: { focus: 'read', note: ['Cylinder 0, head 0, sector 2', '→ 0x8200'] },
      csip: '0000:7C··',
    },
  },
  {
    id: 'A4',
    phase: 'A',
    title: 'The first sector arrives',
    summary: 'The floppy spins up and 512 bytes appear at {0x8200}.',
    detail: 'The BIOS talks to the floppy controller, which moves the read head to ' +
      'cylinder 0 and waits for sector 2 to come around. The data lands in memory, AH = 00 ' +
      'reports no error, and the carry flag is clear, so jnc ("jump if no carry") moves on.',
    time: '≈ 2.6 s',
    state: {
      tab: 'memory',
      signals: { disk: true },
      regs: { 'AX': reg('0001', 'AH = 00 (no error), AL = 01 (one sector read)') },
      writes: { loaded: loaded(0x083FF) },
      code: { focus: ['call', 'check'], current: 'check' },
      memory: { focus: { id: 'free_high', note: 'Sector 2 of the disk', range: [0x08200, 0x083FF] } },
      disk: { focus: 'read', note: ['Cylinder 0, head 0, sector 2', '→ 0x8200 (512 bytes)'] },
    },
  },
  {
    id: 'A5',
    phase: 'A',
    title: 'If a read fails',
    summary: 'Floppies often fail on the first try, so the loader resets the drive and ' +
      'tries again, up to 5 times.',
    detail: 'When INT 13h fails it sets the carry flag. The loader counts the failure in ' +
      'SI, calls function 00h to reset the drive, and retries. After 5 failures it prints ' +
      '"load error" with the same loop as day 1 and stops. Our read worked, so this code ' +
      'is skipped.',
    time: '≈ 2.6 s',
    state: {
      tab: 'code',
      code: { focus: ['retry', 'error'], current: 'nextsec' },
      memory: { focus: { id: 'free_high', note: 'Sector 2 arrived on the first try', range: [0x08200, 0x083FF] } },
    },
  },
  {
    id: 'A6',
    phase: 'A',
    title: 'The rest of the track',
    summary: 'Add 512 bytes to the destination, 1 to the sector number, and repeat until ' +
      'sector 18.',
    detail: 'ES grows by 0x20 each time: 0x20 × 16 = 512 bytes further along. After sector ' +
      '18, the whole first track (cylinder 0, head 0) is in memory: 17 sectors from ' +
      '{0x8200} to {0xA3FF}.',
    formula: 'ES: 0x0820 → 0x0840 → 0x0860 → ... → 0x0A40   (17 × 0x20)',
    time: '≈ 2.8 s',
    state: {
      tab: 'memory',
      regs: {
        'CX': reg('0001', 'CH = 00, CL = 01: back to sector 1'),
        'DX': reg('0100', 'DH = 01: now the other side'),
        'ES': reg('0A40', 'Next destination: 0xA400'),
      },
      writes: { loaded: loaded(0x0A3FF) },
      code: { focus: ['nextsec'], current: 'nexthead' },
      memory: { focus: { id: 'free_high', note: 'Track 1 of 20', range: [0x08200, 0x0A3FF] } },
      disk: { focus: 'read', note: ['Cylinder 0, head 0, sectors 2–18', '→ 0x8200–0xA3FF'] },
    },
  },
  {
    id: 'A7',
    phase: 'A',
    title: 'The other side',
    summary: 'Head 1 reads the same cylinder from the other side of the disk, sectors 1 ' +
      'to 18.',
    detail: 'A cylinder is the pair of tracks at the same distance from the center, one on ' +
      'each side. With both read, cylinder 0 is done, and the loader moves the heads one ' +
      'step inward to cylinder 1.',
    time: '≈ 3.0 s',
    state: {
      regs: {
        'CX': reg('0101', 'CH = 01 (cylinder 1), CL = 01'),
        'DX': reg('0000', 'DH = 00: head 0 again'),
        'ES': reg('0C80', 'Next destination: 0xC800'),
      },
      writes: { loaded: loaded(0x0C7FF) },
      code: { focus: ['nexthead', 'nextcyl'], current: 'nextcyl' },
      memory: { focus: { id: 'free_high', note: 'Cylinder 0 done', range: [0x08200, 0x0C7FF] } },
      disk: { focus: 'read', note: ['Cylinder 0, head 1, sectors 1–18', '→ 0xA400–0xC7FF'] },
    },
  },
  {
    id: 'A8',
    phase: 'A',
    title: 'Ten cylinders',
    summary: 'The same three nested loops run until cylinder 9 is done: 359 sectors in ' +
      'all.',
    detail: 'Sector, then head, then cylinder: the loops walk the disk in the order it ' +
      'spins past the heads, which keeps the drive from seeking back and forth. When CH ' +
      'reaches 10, everything from {0x8200} to {0x34FFF} holds a copy of the disk, ' +
      'including kernel.sys.',
    formula: '17 + 18 + 9 × 36 = 359 sectors × 512 bytes = 183,808 bytes',
    time: '≈ 7 s',
    state: {
      regs: {
        'CX': reg('0A01', 'CH = 0A: 10 cylinders read'),
        'DX': reg('0000', 'DH = 00'),
        'ES': reg('3500', 'One past the end: 0x35000'),
      },
      writes: { loaded: loaded(LOADED_END) },
      code: { focus: ['nextsec', 'nexthead', 'nextcyl'], current: 'done' },
      memory: { focus: { id: 'free_high', note: 'Cylinders 0–9 are in memory', range: [0x08200, LOADED_END] } },
      disk: { focus: 'read', note: ['Cylinders 0–9 read', '→ 0x8200–0x34FFF'] },
    },
  },
  {
    id: 'A9',
    phase: 'A',
    title: 'Jump to the kernel',
    summary: 'The loader writes down how much it read, then jumps to {0xC200}, where ' +
      'kernel.sys now sits.',
    detail: 'The cylinder count goes to {0x0FF0} so the kernel can find it later. Why ' +
      '0xC200? kernel.sys starts at byte 0x4200 of the disk image, and byte n of the disk ' +
      'is now at 0x8000 + n.',
    formula: '{0x8000} + 0x4200 = {0xC200}',
    milestone: { label: 'Loaded', text: 'The whole kernel is in memory' },
    time: '≈ 7 s',
    state: {
      tab: 'code',
      signals: { disk: false },
      regs: {
        'EIP': reg('0000C200', 'The first byte of kernel.sys'),
      },
      writes: { bootInfo: { start: 0x00FF0, end: 0x00FF0, data: [[0x00FF0, [0x0A]]] } },
      code: { focus: ['done', 'jump'], current: 'jump' },
      memory: { focus: { id: 'free_high', note: 'kernel.sys starts here', bytes: [0x0C200, 0x0C200] } },
      disk: { focus: 'kernel', note: ['kernel.sys: disk byte 0x4200', '→ memory 0x8000 + 0x4200 = 0xC200'] },
      csip: '0000:C200',
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'The kernel starts',
    summary: 'The CPU is now running kernel.sys. Its first part is still 16-bit assembly.',
    detail: 'The CODE tab now shows kernel.asm. It prepares the screen and the CPU for ' +
      'the rest of the kernel, which will be written in C. Everything until the switch ' +
      'still runs in real mode, with BIOS services available.',
    time: '≈ 7 s',
    state: {
      code: { program: 'kernelHead', focus: null, current: 'setmode' },
      memory: { focus: { id: 'free_high', note: 'kernel.sys', bytes: [0x0C200, 0x0C200] } },
      disk: { focus: null, note: null },
      visual: 'none',
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'Graphics mode',
    summary: 'INT 10h function 00h, mode 13h: the screen becomes 320 × 200 pixels with ' +
      '256 colors.',
    detail: 'The text disappears. In this mode each pixel is one byte of video memory, ' +
      'starting at {0xA0000} and going row by row: 320 × 200 = 64,000 bytes. The value is ' +
      'a color number; 0 is black, and right now every byte is 0. From day 4, the OS draws ' +
      'by writing into this memory.',
    formula: 'pixel (x, y) is the byte at {0xA0000} + y × 320 + x',
    time: '≈ 7 s',
    state: {
      tab: 'memory',
      regs: { 'EIP': KERNEL_EIP, 'AX': reg('0013', 'AH = 00 (set mode), AL = 13h') },
      monitor: 'graphics',
      screen: [],
      writes: { vram: { start: 0xA0000, end: 0xAF9FF, data: [[0xA0000, new Array(64000).fill(0)]] } },
      code: { focus: ['setmode'], current: 'bootinfo' },
      memory: { focus: { id: 'vram', note: 'Video memory: one byte per pixel', bytes: [0xA0000, 0xA0000] } },
      csip: '0000:C2··',
    },
  },
  {
    id: 'B3',
    phase: 'B',
    title: 'Notes for the C code',
    summary: 'The kernel writes the screen settings and keyboard state next to the ' +
      'cylinder count at {0x0FF0}.',
    detail: 'Once the CPU leaves real mode, the BIOS can no longer be asked anything, so ' +
      'whatever the C code will need must be collected now. The 12 bytes from {0x0FF0} ' +
      'hold: cylinders read, keyboard lights, bits per pixel, width, height, and the ' +
      'address of video memory, each stored low byte first.',
    formula: '0A · 00 · 08 · 00 · 40 01 (320) · C8 00 (200) · 00 00 0A 00 (0xA0000)',
    time: '≈ 7 s',
    state: {
      regs: { 'AX': reg('0200', 'AH = 02; AL = 00: no keyboard lights on') },
      writes: { bootInfo: bootInfo(0x00) },
      code: { focus: ['bootinfo', 'leds'], current: 'mask' },
      memory: { focus: { id: 'free_low', note: 'Boot info for the C code', bytes: [0x00FF0, 0x00FFB] } },
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'Why leave real mode',
    summary: 'Real mode is the 1981 design: 16-bit registers and only 1 MiB of memory.',
    detail: 'In real mode every address is segment × 16 + offset, which tops out just above ' +
      '1 MiB, and nothing stops a program from overwriting the OS. Protected mode, ' +
      'available since the 386, gives 32-bit registers, a 4 GiB address space, and ' +
      'hardware protection. Switching takes four preparations and one flipped bit.',
    formula: 'Real mode: 0xFFFF × 16 + 0xFFFF = 0x10FFEF (just over 1 MiB)\n' +
      'Protected mode: 32-bit addresses up to 0xFFFFFFFF (4 GiB)',
    time: '≈ 7 s',
    state: {
      tab: 'memory',
      code: { focus: null, current: 'mask' },
      memory: { focus: { id: 'extended', note: 'Memory above 1 MiB: out of reach so far' } },
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'Silence the interrupts',
    summary: 'First, make sure no interrupt arrives during the switch.',
    detail: 'An interrupt makes the CPU jump through the vector table from day 0, which ' +
      'only works in real mode. Halfway through the switch that would crash. So the ' +
      'kernel masks every input of both interrupt controllers (PICs) through I/O ports ' +
      '0x21 and 0xA1, then clears the CPU\'s interrupt flag with cli.',
    time: '≈ 7 s',
    state: {
      tab: 'code',
      regs: { 'AX': reg('00FF', 'AL = FF: mask all eight inputs'), 'EFLAGS': reg('00000002', 'IF = 0: interrupts off') },
      code: { focus: ['mask', 'cli'], current: 'a20' },
      memory: { focus: null },
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'Open the A20 line',
    summary: 'Address line 20 is switched on, so addresses above 1 MiB stop wrapping ' +
      'around to 0.',
    detail: 'The 8086 had 20 address lines, and some old programs relied on addresses ' +
      'wrapping past 1 MiB back to 0. To keep them working, IBM added a gate on the 21st ' +
      'line, A20, and wired its switch to the keyboard controller. The kernel sends that ' +
      'chip command D1 and then DF to turn the gate on. Now memory from {0x100000} up is ' +
      'reachable.',
    time: '≈ 7 s',
    state: {
      tab: 'memory',
      regs: { 'AX': reg('00DF', 'AL = DF: output port with A20 on') },
      code: { focus: ['a20', 'kbc'], current: 'lgdt' },
      memory: { focus: { id: 'extended', note: 'Reachable now that A20 is on' } },
    },
  },
  {
    id: 'C4',
    phase: 'C',
    title: 'Describe the segments',
    summary: 'In protected mode a segment register no longer holds an address. It picks ' +
      'an entry in a table, the GDT.',
    detail: 'Each 8-byte entry describes a segment: where it starts (base), how big it is ' +
      '(limit), and what it is for. Our table has the required empty entry, a code segment ' +
      'and a data segment, both covering all 4 GiB from address 0. lgdt tells the CPU ' +
      'where the table is and how big it is.',
    formula: 'Selector 0x08 → entry 1 (code)      Selector 0x10 → entry 2 (data)\n' +
      'GDTR = size 3 × 8 − 1 = 23, plus the table\'s address',
    time: '≈ 7 s',
    state: {
      tab: 'code',
      regs: { 'GDTR': reg('loaded', 'Size 23 and the address of the table') },
      code: { focus: ['lgdt', 'gdt', 'gdtr'], current: 'cr0' },
      memory: { focus: null },
      visual: 'gdt',
      gdt: { focus: 'all' },
    },
  },
  {
    id: 'C5',
    phase: 'C',
    title: 'Flip the switch',
    summary: 'Setting bit 0 of control register CR0, called PE, turns protection on.',
    detail: 'CR0 cannot be changed bit by bit, so the kernel copies it into EAX, sets bit 0 ' +
      'with or, and copies it back. 0F 20 and 0F 22 are the opcodes for moving to and from ' +
      'control registers; the 66 in front of or eax, 1 tells 16-bit code that the next ' +
      'instruction uses a 32-bit register.',
    formula: 'CR0: 00000010 → 00000011   (bit 0, PE = 1)',
    time: '≈ 7 s',
    state: {
      regs: { 'CR0': reg('00000011', 'PE = 1: protected mode') },
      code: { focus: ['cr0'], current: 'farjmp' },
      gdt: { focus: null },
    },
  },
  {
    id: 'C6',
    phase: 'C',
    title: 'The far jump',
    summary: 'A far jump loads CS with selector 0x08, and the CPU starts running 32-bit ' +
      'code.',
    detail: 'Even with PE set, the CPU keeps using the old CS until something reloads it. ' +
      'jmp 0x08:pm_entry does: the CPU looks up entry 1 of the GDT, takes its base (0) and ' +
      'its 32-bit setting, and continues at pm_entry. From this instruction on, the CPU is ' +
      'in protected mode.',
    time: '≈ 7 s + a few µs',
    state: {
      cpu: 'protected',
      regs: {
        'CS': reg('0008', 'Selector: GDT entry 1, the code segment'),
        'CS base': reg('00000000', 'From the GDT entry'),
        'EIP': reg('0000C2··', 'At pm_entry, now 32-bit'),
      },
      code: { focus: ['farjmp'], current: 'segs' },
      visual: 'gdt',
      gdt: { focus: 'code' },
      csip: '0008:0000C2··',
    },
  },
  {
    id: 'C7',
    phase: 'C',
    title: 'Data segments and a stack',
    summary: 'The other segment registers get selector 0x10, and ESP gets a 32-bit stack ' +
      'address.',
    detail: 'DS, ES, and SS still hold real-mode values, which mean nothing now. Loading ' +
      '0x10 points them at entry 2, the data segment covering all memory. The stack moves ' +
      'to {0x90000}, in free memory below the BIOS area and away from the copied disk.',
    time: '≈ 7 s + a few µs',
    state: {
      regs: {
        'DS': reg('0010', 'Selector: GDT entry 2, the data segment'),
        'ES': reg('0010', 'Data segment'),
        'SS': reg('0010', 'Data segment'),
        'SP': reg('00090000', 'ESP: 32-bit stack pointer'),
        'AX': reg('0010', 'Selector 0x10'),
      },
      code: { focus: ['segs'], current: 'callc' },
      gdt: { focus: 'data' },
      memory: { focus: { id: 'free_high', note: 'The new stack top', bytes: [0x8FFFF, 0x8FFFF] } },
    },
  },
  {
    id: 'C8',
    phase: 'C',
    title: 'Into C',
    summary: 'call kernel_main hands control to the first function written in C.',
    detail: 'C is easier to write than assembly, and a compiler turns it into the same kind ' +
      'of machine code. Our first C function has nothing to do yet, so it loops forever, ' +
      'sleeping with hlt. The screen stays black: drawing on it is day 4.',
    time: '≈ 7 s + a few µs',
    state: {
      code: { program: 'kernelMain', focus: ['func', 'loop'], current: 'loop' },
      visual: 'none',
      gdt: { focus: null },
      memory: { focus: null },
    },
  },
  {
    id: 'C9',
    phase: 'C',
    title: 'What day 3 did',
    summary: 'The OS is loaded, the screen is in graphics mode, and a C function is running ' +
      'in 32-bit protected mode.',
    detail: 'Three jobs in one day: the boot sector copied 180 KiB of disk into memory; ' +
      'the kernel switched the screen to 320 × 200 graphics and saved the settings; then it ' +
      'silenced interrupts, opened A20, loaded a GDT, set PE, and jumped into 32-bit code ' +
      'that calls C. Every later day builds on this.',
    hint: 'Day 4: drawing on the screen from C. Coming soon.',
    milestone: { label: '32-bit C', text: 'Protected mode, running C' },
    time: '≈ 7 s + a few µs',
    state: {
      tab: 'memory',
      code: { focus: null },
      memory: { focus: { id: 'free_high', note: 'The copied disk, with the kernel', range: [0x08200, LOADED_END] } },
    },
  },
]);

export const DAY_03 = Object.freeze({
  id: 'day3',
  title: 'Day 3',
  name: 'Load the OS, go 32-bit',
  phases: PHASES,
  steps: STEPS,
});
