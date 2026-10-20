// Real-mode (first 1 MiB) memory map of an IBM PC compatible.
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
]);
