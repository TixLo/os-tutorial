// Day 25's programs: a beep through the timer chip and the speaker, 216 colors, and more
// than one console. Simplified teaching code written for this site; lines share a tag so
// a step can highlight them.

export const DAY25_BEEP = Object.freeze({
  name: 'console.c (hrb_api)',
  illustrative: true,
  lines: [
    { source: '} else if (edx == 20) {', comment: '20: beep at EAX millihertz, 0 = stop', tag: 'api' },
    { source: '    if (eax == 0) {', tag: 'off' },
    { source: '        i = io_in8(0x61);', tag: 'off' },
    { source: '        io_out8(0x61, i & 0x0d);', comment: 'Speaker off', tag: 'off' },
    { source: '    } else {', tag: 'on' },
    { source: '        i = 1193180000 / eax;', comment: 'Timer chip steps per wave', tag: 'on' },
    { source: '        io_out8(0x43, 0xb6);', comment: 'Counter 2: square wave', tag: 'on' },
    { source: '        io_out8(0x42, i & 0xff);', tag: 'on' },
    { source: '        io_out8(0x42, i >> 8);', tag: 'on' },
    { source: '        i = io_in8(0x61);', tag: 'on' },
    { source: '        io_out8(0x61, (i | 0x03) & 0x0f);', comment: 'Connect counter 2 to the speaker, on', tag: 'on' },
    { source: '    }', tag: 'on' },
    { source: '}', tag: 'api' },
  ],
});

export const DAY25_COLORS = Object.freeze({
  name: 'graphics.c / color.c',
  illustrative: true,
  lines: [
    { source: 'unsigned char table2[216 * 3];', tag: 'cube' },
    { source: 'for (b = 0; b < 6; b++)', comment: '6 levels of each channel', tag: 'cube' },
    { source: '    for (g = 0; g < 6; g++)', tag: 'cube' },
    { source: '        for (r = 0; r < 6; r++) {', tag: 'cube' },
    { source: '            table2[(r + g * 6 + b * 36) * 3 + 0] = r * 51;', tag: 'cube' },
    { source: '            table2[(r + g * 6 + b * 36) * 3 + 1] = g * 51;', tag: 'cube' },
    { source: '            table2[(r + g * 6 + b * 36) * 3 + 2] = b * 51;', tag: 'cube' },
    { source: '        }', tag: 'cube' },
    { source: 'set_palette(16, 231, table2);', comment: 'Colors 16 to 231', tag: 'cube' },
    { source: '' },
    { heading: 'color.c: red across, green down' },
    { source: 'for (y = 0; y < 128; y++) {', tag: 'app' },
    { source: '    for (x = 0; x < 128; x++) {', tag: 'app' },
    { source: '        r = x * 6 / 128;', tag: 'app' },
    { source: '        g = y * 6 / 128;', tag: 'app' },
    { source: '        buf[(x + 8) + (y + 28) * 144] = 16 + r + g * 6;', comment: 'b = 0', tag: 'app' },
    { source: '    }', tag: 'app' },
    { source: '}', tag: 'app' },
    { source: 'api_refreshwin(win, 8, 28, 136, 156);', tag: 'app' },
  ],
});

export const DAY25_CONSOLES = Object.freeze({
  name: 'main.c',
  illustrative: true,
  lines: [
    { source: 'for (i = 0; i < 2; i++) {', comment: 'Two consoles, two tasks', tag: 'make' },
    { source: '    sht_cons[i] = sheet_alloc(shtctl);', tag: 'make' },
    { source: '    buf_cons[i] = (unsigned char *) memman_alloc_4k(memman, 256 * 165);', tag: 'make' },
    { source: '    make_window(buf_cons[i], 256, 165, "console", 0);', tag: 'make' },
    { source: '    task_cons[i] = task_alloc();', tag: 'make' },
    { source: '    /* stack, eip = console_task, argument = its layer */', tag: 'make' },
    { source: '    task_run(task_cons[i], 2, 2);', tag: 'make' },
    { source: '    sht_cons[i]->task = task_cons[i];', comment: 'Each layer knows its task', tag: 'route' },
    { source: '    sht_cons[i]->flags |= 0x20;', comment: '"Has a text cursor"', tag: 'route' },
    { source: '}', tag: 'make' },
    { source: '' },
    { heading: 'Keys go to whichever window is in front' },
    { source: 'if (key_win->task != 0) {', tag: 'route' },
    { source: '    fifo32_put(&key_win->task->fifo, s[0] + 256);', comment: 'Its own task\'s FIFO', tag: 'route' },
    { source: '}', tag: 'route' },
  ],
});
