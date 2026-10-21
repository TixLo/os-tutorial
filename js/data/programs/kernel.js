// Day 3's kernel: the assembly start of kernel.sys (loaded at 0xC200), which switches the
// screen to graphics mode, moves the CPU into 32-bit protected mode, and calls the first C
// function. Simplified teaching code written for this site; lines share a tag so a step
// can highlight them.
export const KERNEL_HEAD = Object.freeze({
  name: 'kernel.asm',
  illustrative: true,
  lines: [
    { source: 'org 0xc200', comment: 'The IPL jumps here' },
    { source: 'bits 16', comment: 'Still in real mode' },

    { heading: 'Switch the screen to graphics mode' },
    { source: 'mov ah, 0x00', bytes: [0xB4, 0x00], comment: 'Video function 00h: set mode', tag: 'setmode' },
    { source: 'mov al, 0x13', bytes: [0xB0, 0x13], comment: 'Mode 13h: 320 × 200, 256 colors', tag: 'setmode' },
    { source: 'int 0x10', bytes: [0xCD, 0x10], tag: 'setmode' },

    { heading: 'Write down the screen settings for the C code (boot info at 0x0FF0)' },
    { source: 'mov byte [0x0ff2], 8', comment: 'Bits per pixel', tag: 'bootinfo' },
    { source: 'mov word [0x0ff4], 320', comment: 'Screen width', tag: 'bootinfo' },
    { source: 'mov word [0x0ff6], 200', comment: 'Screen height', tag: 'bootinfo' },
    { source: 'mov dword [0x0ff8], 0xa0000', comment: 'Where video memory starts', tag: 'bootinfo' },
    { source: 'mov ah, 0x02', bytes: [0xB4, 0x02], comment: 'Keyboard function 02h: shift and lock state', tag: 'leds' },
    { source: 'int 0x16', bytes: [0xCD, 0x16], tag: 'leds' },
    { source: 'mov [0x0ff1], al', comment: 'Keyboard lights (Caps Lock and so on)', tag: 'leds' },

    { heading: 'Get ready for protected mode' },
    { source: 'mov al, 0xff', bytes: [0xB0, 0xFF], tag: 'mask' },
    { source: 'out 0x21, al', bytes: [0xE6, 0x21], comment: 'Mask every interrupt on the first PIC', tag: 'mask' },
    { source: 'out 0xa1, al', bytes: [0xE6, 0xA1], comment: 'And on the second', tag: 'mask' },
    { source: 'cli', bytes: [0xFA], comment: 'And stop interrupts in the CPU', tag: 'cli' },
    { source: 'call kbc_wait', tag: 'a20' },
    { source: 'mov al, 0xd1', bytes: [0xB0, 0xD1], tag: 'a20' },
    { source: 'out 0x64, al', bytes: [0xE6, 0x64], comment: 'Keyboard controller: write the output port', tag: 'a20' },
    { source: 'call kbc_wait', tag: 'a20' },
    { source: 'mov al, 0xdf', bytes: [0xB0, 0xDF], tag: 'a20' },
    { source: 'out 0x60, al', bytes: [0xE6, 0x60], comment: 'New port value, with the A20 line on', tag: 'a20' },
    { source: 'call kbc_wait', tag: 'a20' },
    { source: 'lgdt [gdtr]', comment: 'Tell the CPU where the segment table is', tag: 'lgdt' },

    { heading: 'Switch' },
    { source: 'mov eax, cr0', bytes: [0x0F, 0x20, 0xC0], tag: 'cr0' },
    { source: 'or eax, 1', bytes: [0x66, 0x83, 0xC8, 0x01], comment: 'Set bit 0, PE: protection enable', tag: 'cr0' },
    { source: 'mov cr0, eax', bytes: [0x0F, 0x22, 0xC0], tag: 'cr0' },
    { source: 'jmp dword 0x08:pm_entry', comment: 'Far jump: load CS from the table', tag: 'farjmp' },

    { source: 'bits 32', comment: 'From here on, 32-bit code' },
    { label: 'pm_entry' },
    { source: 'mov ax, 0x10', comment: 'Selector of the data segment', tag: 'segs' },
    { source: 'mov ds, ax', tag: 'segs' },
    { source: 'mov es, ax', tag: 'segs' },
    { source: 'mov ss, ax', tag: 'segs' },
    { source: 'mov esp, 0x00090000', comment: 'Stack in free memory below the BIOS area', tag: 'segs' },
    { source: 'call kernel_main', comment: 'Into C', tag: 'callc' },
    { label: 'hang' },
    { source: 'hlt', bytes: [0xF4], comment: 'If C ever returns, sleep', tag: 'hang' },
    { source: 'jmp hang', tag: 'hang' },

    { label: 'kbc_wait' },
    { source: 'in al, 0x64', bytes: [0xE4, 0x64], comment: 'Read the keyboard controller status', tag: 'kbc' },
    { source: 'test al, 0x02', comment: 'Still busy?', tag: 'kbc' },
    { source: 'jnz kbc_wait', tag: 'kbc' },
    { source: 'ret', bytes: [0xC3], tag: 'kbc' },

    { heading: 'Segment table (GDT): 8 bytes per entry' },
    { label: 'gdt' },
    { source: 'dq 0', comment: 'Entry 0: must be empty', tag: 'gdt' },
    { source: 'dq 0x00cf9a000000ffff', comment: 'Entry 1 (selector 0x08): code, base 0, 4 GiB', tag: 'gdt' },
    { source: 'dq 0x00cf92000000ffff', comment: 'Entry 2 (selector 0x10): data, base 0, 4 GiB', tag: 'gdt' },
    { label: 'gdtr' },
    { source: 'dw gdtr - gdt - 1', comment: 'Size of the table minus 1: 23', tag: 'gdtr' },
    { source: 'dd gdt', comment: 'Address of the table', tag: 'gdtr' },
  ],
});

// The first C code. It has nothing to do yet, so it sleeps.
export const KERNEL_MAIN = Object.freeze({
  name: 'kernel.c',
  illustrative: true,
  lines: [
    { source: '// The kernel\'s first C function, called from kernel.asm' },
    { source: 'void kernel_main(void)', tag: 'func' },
    { source: '{', tag: 'func' },
    { source: '    for (;;) {', comment: 'Forever', tag: 'loop' },
    { source: '        __asm__("hlt");', comment: 'Nothing to do yet: sleep', tag: 'loop' },
    { source: '    }', tag: 'loop' },
    { source: '}', tag: 'func' },
  ],
});
