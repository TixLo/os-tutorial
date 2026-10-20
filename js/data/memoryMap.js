// Memory map of an IBM PC compatible: the real-mode first 1 MiB plus the reset vector area.
// kind: 'ram' | 'vram' | 'rom' | 'reserved'
export const MEMORY_MAP = Object.freeze([
  { id: 'ivt',         start: 0x00000, end: 0x003FF, name: 'Interrupt vector table', kind: 'ram' },
  { id: 'bda',         start: 0x00400, end: 0x004FF, name: 'BIOS data area',         kind: 'ram' },
  { id: 'free_low',    start: 0x00500, end: 0x07BFF, name: 'Free',                   kind: 'ram' },
  { id: 'boot_sector', start: 0x07C00, end: 0x07DFF, name: 'Boot sector',            kind: 'ram' },
  { id: 'free_high',   start: 0x07E00, end: 0x9FBFF, name: 'Free',                   kind: 'ram' },
  { id: 'ebda',        start: 0x9FC00, end: 0x9FFFF, name: 'Extended BIOS data area', kind: 'ram' },
  { id: 'vram',        start: 0xA0000, end: 0xBFFFF, name: 'Video memory',           kind: 'vram' },
  { id: 'video_bios',  start: 0xC0000, end: 0xC7FFF, name: 'Video BIOS',             kind: 'rom' },
  { id: 'option_rom',  start: 0xC8000, end: 0xEFFFF, name: 'Option ROMs / unmapped', kind: 'reserved' },
  { id: 'system_bios', start: 0xF0000, end: 0xFFFFF, name: 'System BIOS',            kind: 'rom' },
  // The chipset also maps the BIOS ROM to the top of the 4 GiB address space,
  // where the CPU fetches its first instruction after reset.
  { id: 'bios_alias',  start: 0xFFFF0000, end: 0xFFFFFFFF, name: 'BIOS ROM (top of 4 GiB)', kind: 'rom' },
]);

// ROM bytes the tutorial shows. Everything else in ROM is real firmware we don't model.
// The first instruction after reset is a far jump, jmp F000:E05B: opcode EA, then the
// offset 0xE05B and the segment 0xF000, each stored low byte first. The same ROM
// appears at the reset vector and at 0xFFFF0 in the 1 MiB view.
const RESET_JUMP = Object.freeze([0xEA, 0x5B, 0xE0, 0x00, 0xF0]);

export const ROM_BYTES = Object.freeze([
  { address: 0xFFFFFFF0, bytes: RESET_JUMP },
  { address: 0x000FFFF0, bytes: RESET_JUMP },
  // Video BIOS option ROM header: signature 55 AA, then the size in 512-byte blocks
  { address: 0x000C0000, bytes: [0x55, 0xAA, 0x40] },
]);
