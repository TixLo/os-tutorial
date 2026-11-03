// Day 21's programs: an app that damages the OS, a data segment of its own for each app,
// running apps at privilege level 3, and the handler for the CPU's protection exception.
// Simplified teaching code written for this site; lines share a tag so a step can
// highlight them.

export const CRACK1_BYTES = Object.freeze([0xC6, 0x05, 0x00, 0xA6, 0x00, 0x00, 0x00, 0xCB]);
export const CRACK2_BYTES = Object.freeze([
  0x66, 0xB8, 0x10, 0x00,
  0x8E, 0xD8,
  0xC6, 0x05, 0x00, 0xA6, 0x00, 0x00, 0x00,
  0xBA, 0x04, 0x00, 0x00, 0x00,
  0xCD, 0x40,
]);

export const DAY21_CRACK = Object.freeze({
  name: 'crack.asm',
  illustrative: true,
  lines: [
    { heading: 'Version 1: DS is still the kernel\'s data segment, covering all memory' },
    { source: 'mov byte [0xa600], 0', bytes: CRACK1_BYTES.slice(0, 7), comment: 'The root directory\'s first byte', tag: 'v1' },
    { source: 'retf', bytes: CRACK1_BYTES.slice(7), tag: 'v1' },
    { source: '' },
    { heading: 'Version 2: load the kernel\'s data selector itself' },
    { source: 'mov ax, 0x10', bytes: CRACK2_BYTES.slice(0, 4), comment: 'Selector 0x10: GDT entry 2', tag: 'v2' },
    { source: 'mov ds, ax', bytes: CRACK2_BYTES.slice(4, 6), comment: 'Allowed? Depends on the privilege level', tag: 'load' },
    { source: 'mov byte [0xa600], 0', bytes: CRACK2_BYTES.slice(6, 13), tag: 'v2' },
    { source: 'mov edx, 4', bytes: CRACK2_BYTES.slice(13, 18), comment: 'API 4: end the app', tag: 'v2' },
    { source: 'int 0x40', bytes: CRACK2_BYTES.slice(18), tag: 'v2' },
  ],
});

export const DAY21_SEGMENTS = Object.freeze({
  name: 'console.c',
  illustrative: true,
  lines: [
    { source: 'p = (char *) memman_alloc_4k(memman, finfo->size);', comment: 'The app\'s code', tag: 'alloc' },
    { source: 'q = (char *) memman_alloc_4k(memman, 64 * 1024);', comment: 'and 64 KiB for its data and stack', tag: 'alloc' },
    { source: 'set_segmdesc(gdt + 1003, finfo->size - 1, (int) p, AR_CODE32_ER + 0x60);', comment: '+ 0x60: privilege level 3', tag: 'seg' },
    { source: 'set_segmdesc(gdt + 1004, 64 * 1024 - 1, (int) q, AR_DATA32_RW + 0x60);', comment: 'Its own data segment, level 3', tag: 'seg' },
    { source: 'start_app(0, 1003 * 8, 64 * 1024, 1004 * 8, &(task->tss.esp0));', comment: 'Enter level 3', tag: 'start' },
    { source: 'memman_free_4k(memman, (int) p, finfo->size);', tag: 'free' },
    { source: 'memman_free_4k(memman, (int) q, 64 * 1024);', tag: 'free' },
    { source: '' },
    { heading: 'asmfunc.asm: start_app(eip, cs, esp, ds, &tss_esp0)' },
    { label: 'start_app' },
    { source: 'pushad', bytes: [0x60], comment: 'Save the kernel\'s registers', tag: 'enter' },
    { source: 'mov eax, [esp+36]', comment: 'eip, cs, esp, ds of the app', tag: 'enter' },
    { source: 'mov ecx, [esp+40]', tag: 'enter' },
    { source: 'mov edx, [esp+44]', tag: 'enter' },
    { source: 'mov ebx, [esp+48]', tag: 'enter' },
    { source: 'mov ebp, [esp+52]', tag: 'esp0' },
    { source: 'mov [ebp], esp', comment: 'tss.esp0 = the kernel\'s stack, for the way back', tag: 'esp0' },
    { source: 'mov [ebp+4], ss', comment: 'tss.ss0', tag: 'esp0' },
    { source: 'mov es, bx', tag: 'enter' },
    { source: 'mov ds, bx', tag: 'enter' },
    { source: 'mov fs, bx', tag: 'enter' },
    { source: 'mov gs, bx', tag: 'enter' },
    { source: 'or ecx, 3', comment: 'Selectors with requested level 3', tag: 'retf' },
    { source: 'or ebx, 3', tag: 'retf' },
    { source: 'push ebx', comment: 'SS', tag: 'retf' },
    { source: 'push edx', comment: 'ESP', tag: 'retf' },
    { source: 'push ecx', comment: 'CS', tag: 'retf' },
    { source: 'push eax', comment: 'EIP', tag: 'retf' },
    { source: 'retf', bytes: [0xCB], comment: '"Return" into the app, at level 3', tag: 'retf' },
  ],
});

export const DAY21_EXCEPTION = Object.freeze({
  name: 'console.c',
  illustrative: true,
  lines: [
    { source: 'set_gatedesc(idt + 0x0d, (int) asm_inthandler0d, 1 * 8, AR_INTGATE32);', comment: 'INT 0x0D: general protection', tag: 'gate' },
    { source: 'set_gatedesc(idt + 0x40, (int) asm_hrb_api, 1 * 8, AR_INTGATE32 + 0x60);', comment: 'Level 3 may call INT 0x40', tag: 'gate' },
    { source: '' },
    { source: 'int *inthandler0d(int *esp)', tag: 'handler' },
    { source: '{', tag: 'handler' },
    { source: '    struct TASK *task = task_now();', tag: 'handler' },
    { source: '    cons_putstr0(task->cons, "\\nINT 0D :\\n General Protected Exception.\\n");', tag: 'handler' },
    { source: '    return &(task->tss.esp0);', comment: 'Non-zero: end the app', tag: 'end' },
    { source: '}', tag: 'handler' },
    { source: '' },
    { source: 'int *hrb_api(int edi, int esi, int ebp, int esp, int ebx, int edx, int ecx, int eax)', tag: 'api' },
    { source: '{', tag: 'api' },
    { source: '    /* functions 1 to 3 as before */', tag: 'api' },
    { source: '    if (edx == 4) {', comment: 'End the app', tag: 'end' },
    { source: '        return &(task->tss.esp0);', comment: 'The kernel stack start_app saved', tag: 'end' },
    { source: '    }', tag: 'end' },
    { source: '    return 0;', tag: 'api' },
    { source: '}', tag: 'api' },
    { source: '' },
    { heading: 'asm_inthandler0d / asm_hrb_api, after calling C:' },
    { source: 'cmp eax, 0', tag: 'end' },
    { source: 'jne end_app', comment: 'Asked to end: switch to the saved kernel stack', tag: 'end' },
    { label: 'end_app' },
    { source: 'mov esp, [eax]', comment: 'ESP = tss.esp0', tag: 'end' },
    { source: 'popad', bytes: [0x61], comment: 'The registers start_app pushed', tag: 'end' },
    { source: 'ret', bytes: [0xC3], comment: 'Return from start_app, into cmd_app', tag: 'end' },
  ],
});
