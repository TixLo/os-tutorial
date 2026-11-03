// Day 30's programs: the core ideas of four larger applications. Simplified teaching code
// written for this site; lines share a tag so a step can highlight them.

export const DAY30_CALC = Object.freeze({
  name: 'calc.c',
  illustrative: true,
  lines: [
    { source: 'int getnum(char **pp, int priority)', comment: 'Read an expression, stopping at weaker operators', tag: 'parse' },
    { source: '{', tag: 'parse' },
    { source: '    int i = read_number_or_parentheses(pp);', tag: 'parse' },
    { source: '    for (;;) {', tag: 'parse' },
    { source: '        char op = next_operator(pp);', tag: 'parse' },
    { source: '        if (op == \'*\' && priority > 4) i *= getnum(pp, 4);', comment: '* and / bind tighter', tag: 'prec' },
    { source: '        else if (op == \'/\' && priority > 4) i /= getnum(pp, 4);', tag: 'prec' },
    { source: '        else if (op == \'+\' && priority > 5) i += getnum(pp, 5);', comment: 'than + and -', tag: 'prec' },
    { source: '        else if (op == \'-\' && priority > 5) i -= getnum(pp, 5);', tag: 'prec' },
    { source: '        else break;', tag: 'parse' },
    { source: '    }', tag: 'parse' },
    { source: '    return i;', tag: 'parse' },
    { source: '}', tag: 'parse' },
    { source: '' },
    { source: 'api_cmdline(s, 30);', comment: '"calc 123+456*2"', tag: 'main' },
    { source: 'printf("= %d = 0x%X\\n", getnum(&p, 9), i);', tag: 'main' },
  ],
});

export const DAY30_TVIEW = Object.freeze({
  name: 'tview.c',
  illustrative: true,
  lines: [
    { source: 'tview hello.txt -w30 -h10 -t4', comment: 'File, window width and height, tab size', tag: 'usage' },
    { source: '' },
    { source: 'for (;;) {', tag: 'loop' },
    { source: '    textview(win, w, h, xskip, p, t, lang);', comment: 'Draw the visible part', tag: 'loop' },
    { source: '    i = api_getkey(1);', tag: 'loop' },
    { source: '    if (i == \'8\' && p > buf) p = line_up(p);', comment: 'Keys 8 and 2 scroll', tag: 'keys' },
    { source: '    if (i == \'2\') p = line_down(p);', tag: 'keys' },
    { source: '    if (i == \'4\' && xskip > 0) xskip -= 8;', comment: '4 and 6 move sideways', tag: 'keys' },
    { source: '    if (i == \'6\') xskip += 8;', tag: 'keys' },
    { source: '    if (i == \'q\') break;', tag: 'keys' },
    { source: '}', tag: 'loop' },
  ],
});

export const DAY30_MML = Object.freeze({
  name: 'mmlplay.c',
  illustrative: true,
  lines: [
    { source: 'static int tonetable[12] = {', comment: 'Note frequencies × 1000, octave 0', tag: 'table' },
    { source: '    1071618315, 1135340056, 1202850889, /* ... C, C#, D, ... B */', tag: 'table' },
    { source: '};', tag: 'table' },
    { source: '' },
    { source: 'for (;;) {', comment: 'Play a text like "T120 O4 L8 CDEFGAB>C"', tag: 'loop' },
    { source: '    c = *p++;', tag: 'loop' },
    { source: '    if (\'A\' <= c && c <= \'G\') {', comment: 'A note', tag: 'note' },
    { source: '        api_beep(tonetable[note_index(c)] >> (17 - octave));', tag: 'note' },
    { source: '        api_settimer(timer, length);', comment: 'Hold it for its length', tag: 'note' },
    { source: '        wait_for(timer);', tag: 'note' },
    { source: '    } else if (c == \'O\') { octave = read_number(&p);', tag: 'cmd' },
    { source: '    } else if (c == \'L\') { default_length = read_number(&p);', tag: 'cmd' },
    { source: '    } else if (c == \'T\') { tempo = read_number(&p);', tag: 'cmd' },
    { source: '    } else if (c == 0) break;', tag: 'loop' },
    { source: '}', tag: 'loop' },
    { source: 'api_beep(0);', comment: 'Silence', tag: 'loop' },
  ],
});

export const DAY30_GVIEW = Object.freeze({
  name: 'gview.c',
  illustrative: true,
  lines: [
    { source: 'fh = api_fopen(filename);', tag: 'load' },
    { source: 'api_fread(filebuf, fsize, fh);', comment: 'The whole image file', tag: 'load' },
    { source: 'if (info_bmp(env, info, fsize, filebuf) == 0) {', comment: 'Not a BMP?', tag: 'detect' },
    { source: '    if (info_jpeg(env, info, fsize, filebuf) == 0) {', comment: 'Not a JPEG either?', tag: 'detect' },
    { source: '        error("file type unknown.");', tag: 'detect' },
    { source: '    }', tag: 'detect' },
    { source: '}', tag: 'detect' },
    { source: '/* decode into 24-bit RGB pixels */', tag: 'decode' },
    { source: 'for (y = 0; y < info[3]; y++) {', tag: 'show' },
    { source: '    for (x = 0; x < info[2]; x++) {', tag: 'show' },
    { source: '        winbuf[...] = rgb2pal(r, g, b, x, y);', comment: 'Nearest of the 216 colors, with dithering', tag: 'show' },
    { source: '    }', tag: 'show' },
    { source: '}', tag: 'show' },
  ],
});
