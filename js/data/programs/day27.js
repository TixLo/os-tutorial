// Day 27's programs: a local descriptor table (LDT) per task for its app's segments, and
// the API glue as a library. Simplified teaching code written for this site; lines share
// a tag so a step can highlight them.

export const DAY27_LDT = Object.freeze({
  name: 'mtask.c / console.c',
  illustrative: true,
  lines: [
    { source: 'struct TASK {', tag: 'struct' },
    { source: '    int sel, flags, level, priority;', tag: 'struct' },
    { source: '    struct FIFO32 fifo;', tag: 'struct' },
    { source: '    struct TSS32 tss;', tag: 'struct' },
    { source: '    struct SEGMENT_DESCRIPTOR ldt[2];', comment: 'Two entries of its own: app code, app data', tag: 'struct' },
    { source: '    /* ... */', tag: 'struct' },
    { source: '};', tag: 'struct' },
    { source: '' },
    { heading: 'task_init: every task gets a TSS entry and an LDT entry in the GDT' },
    { source: 'for (i = 0; i < MAX_TASKS; i++) {', tag: 'init' },
    { source: '    taskctl->tasks0[i].sel = (TASK_GDT0 + i) * 8;', tag: 'init' },
    { source: '    taskctl->tasks0[i].tss.ldtr = (TASK_GDT0 + MAX_TASKS + i) * 8;', comment: 'The CPU loads it at each switch', tag: 'init' },
    { source: '    set_segmdesc(gdt + TASK_GDT0 + i, 103, (int) &taskctl->tasks0[i].tss, AR_TSS32);', tag: 'init' },
    { source: '    set_segmdesc(gdt + TASK_GDT0 + MAX_TASKS + i, 15, (int) taskctl->tasks0[i].ldt, AR_LDT);', comment: '16 bytes, type 0x82', tag: 'init' },
    { source: '}', tag: 'init' },
    { source: '' },
    { heading: 'cmd_app: the app\'s segments go into the task\'s own LDT' },
    { source: 'set_segmdesc(task->ldt + 0, finfo->size - 1, (int) p, AR_CODE32_ER + 0x60);', tag: 'app' },
    { source: 'set_segmdesc(task->ldt + 1, segsiz - 1, (int) q, AR_DATA32_RW + 0x60);', tag: 'app' },
    { source: 'start_app(h->entry, 0 * 8 + 4, h->esp, 1 * 8 + 4, &(task->tss.esp0));', comment: '+ 4: TI bit, "look in the LDT"', tag: 'app' },
  ],
});

export const DAY27_LIB = Object.freeze({
  name: 'Makefile (apilib)',
  illustrative: true,
  lines: [
    { heading: 'One small file per API function...' },
    { source: 'API = api001.o api002.o api003.o api004.o api005.o ... api027.o', tag: 'files' },
    { source: '' },
    { heading: '... collected into one library' },
    { source: 'apilib.a: $(API)', tag: 'lib' },
    { source: '\tar rcs apilib.a $(API)', comment: 'An archive of object files', tag: 'lib' },
    { source: '' },
    { heading: 'Linking an app pulls in only the functions it calls' },
    { source: '%.app: %.o apilib.a app.ld', tag: 'link' },
    { source: '\tld -T app.ld -o $@ $< apilib.a', comment: 'hello2 gets api_putstr0 and api_end, nothing else', tag: 'link' },
  ],
});
