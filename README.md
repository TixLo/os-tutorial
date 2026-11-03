# os-tutorial

**Live site: <https://tixlo.github.io/os-tutorial/>**

## About

This site was made to help people study Hidemi Kawai's book
*30日でできる! OS自作入門* (Chinese edition: *30天自制操作系统*), in which you
build a small operating system from scratch in 30 days. Reading about
registers, interrupts, and memory addresses is hard to picture, so the site
shows them: you step through what the computer does and watch the hardware,
the memory, and the screen change at each step. It is meant to be read
alongside the book, not instead of it.

The book starts on day 1 with the boot sector already loaded into memory.
To make that starting point make sense, the site adds a **day 0** that the
book does not have: what happens between pressing the power button and the
boot sector taking over at `0x7C00`. It covers the power supply and reset
signals, the CPU's reset state and first instruction, the BIOS power-on self
test, and how the first sector of the floppy gets loaded and run.

All code shown is written for this site, including the font. Days 1 and 2 use
a complete boot sector; from day 3 on, programs are simplified for teaching: the structure,
BIOS calls, key instructions, and addresses are real, but they are not a
complete OS you can assemble and boot.

It is an unofficial companion, not affiliated with the author or the
publishers; see [Credits](#credits).

## Layout

The explanation (steps, a diagram for the chapter, CPU registers) fills the
left half. The right half has the display (the machine's screen) on top and,
below it, tabs for MEMORY, CODE, and TERMINAL. Until day 17 the terminal is a
debugger view that shows what a step looks at (memory dumps, I/O port
writes); from day 17 it becomes the OS's own console. Each step opens the tab it is about. Both
splitters can be dragged.

## Running locally

The scripts are ES modules, so browsers won't load them from `file://`.
Serve the folder over HTTP instead:

```bash
python3 -m http.server 8123
```

Then open <http://localhost:8123/>.

Before committing, check every chapter's data (step fields, code tags, memory
regions, address links, English-only text):

```bash
node tools/check.mjs
```

## Project structure

The code follows MVC. Each feature is a model / view / controller trio wired
together in `js/main.js`.

```
index.html                 Markup only: page frame, four panels, diagram SVGs
css/
  base.css                 Design tokens (colors, sizes) and resets
  layout.css               Page frame, split areas, responsive rules
  panels.css               Panel chrome and splitters
  player.css               Video-player controls on the front panel
  front-panel.css          Power button and LEDs
  display.css              Display panel drawn as a monitor
  terminal.css             Terminal tab (placeholder)
  dock.css                 MEMORY / CODE / TERMINAL tabs and the code listing
  diagram.css              Table diagrams drawn from step data
  memory.css               Zoomable page grid, zoom trail, detail line, legend
  lesson.css               Step explanation and register table
  board.css                Motherboard diagram signal states
  disk.css                 Diagram slot and the floppy disk diagram
  about.css                ABOUT button and dialog
js/
  main.js                  Entry point: builds and starts each trio
  core/
    EventEmitter.js        Shared pub/sub for models and views
    state.js               Merging step state patches
    raster.js              Drawing lists -> video memory bytes (graphics mode)
  data/                    Static facts the models load (no logic)
    chapters/
      index.js             Chapter list: day 0 plus the book's 30 days
      day00.js             Day 0 steps: text, timing, and hardware state patches
      day01.js             Day 1: inside the boot sector, then running it
      day02.js             Day 2: how each instruction becomes its bytes
      day03.js             Day 3: load the OS, graphics mode, protected mode, C
      day04.js             Day 4: drawing from C, the palette, rectangles
      day05.js             Day 5: boot info struct, text, mouse cursor, GDT and IDT
      day06.js             Day 6: split compilation, PIC setup, the first interrupt
      day07.js             Day 7: key codes, ring buffers, switching on the mouse
      day08.js             Day 8: mouse packets, moving the cursor, the far jump
      day09.js             Day 9: measuring memory, a memory manager
      day10.js             Day 10: 4 KiB allocation, layers, partial redraws
      day11.js             Day 11: a window, a counter, the layer map
      day12.js             Day 12: the timer chip, keeping time, timers
      day13.js             Day 13: one FIFO for every event, a sorted timer list
      day14.js             Day 14: VBE 640 × 480, typing into a text box, dragging
      day15.js             Day 15: TSS, switching tasks, switching on a timer
      day16.js             Day 16: task manager, sleep and wake, priorities, levels
      day17.js             Day 17: the console task, Tab, Shift, Caps Lock, scrolling
      day18.js             Day 18: mem, cls, and dir from the FAT12 root directory
      day19.js             Day 19: type, the FAT, and running a program from the disk
      day20.js             Day 20: returning from apps, INT 0x40 system calls
      day21.js             Day 21: app data segments, privilege level 3, exception 0x0D
      day22.js             Day 22: apps in C, the app header, bugs, windows for apps
      desktop640.js        The 640 × 480 desktop with the console, shared from day 17
    programs/
      assemble.js          Write programs as data: source, bytes, comments
      helloBoot.js         Day 1's boot sector (complete)
      ipl.js               Day 3's loader (simplified)
      kernel.js            Day 3's kernel start and first C function (simplified)
      day04.js             Day 4's assembly helpers and drawing code (simplified)
      day05.js             Day 5's text, cursor, and table code (simplified)
      day06.js             Day 6's Makefile, PIC setup, and handlers (simplified)
      day07.js             Day 7's handlers, FIFO, and mouse setup (simplified)
      day08.js             Day 8's mouse decoder and cursor movement (simplified)
      day09.js             Day 9's memory test and memory manager (simplified)
      day10.js             Day 10's layer (sheet) code (simplified)
      day11.js             Day 11's window, counter, and map code (simplified)
      day12.js             Day 12's timer code (simplified)
      day13.js             Day 13's FIFO32 and timer list (simplified)
      day14.js             Day 14's VBE setup, key table, and dragging (simplified)
      day15.js             Day 15's TSS setup, task B, and timer switching (simplified)
      day16.js             Day 16's task manager (simplified)
      day17.js             Day 17's console task and keyboard handling (simplified)
      day18.js             Day 18's console commands (simplified)
      day19.js             Day 19's type command, FAT code, and hlt.app (simplified)
      day20.js             Day 20's app call, API handler, and hello.app (simplified)
      day21.js             Day 21's crack.app, start_app, and exception handler (simplified)
      day22.js             Day 22's API glue, header check, bug handling, window API (simplified)
      index.js             Programs a step can show in the code panel
    memoryMap.js           Memory map regions and the ROM bytes the tutorial shows
    palettes.js            The card's power-on palette and the OS's 16 colors
    font.js                The OS's 8 × 16 font, drawn for this site
    screens.js             Drawing lists for the OS's screens (desktop, windows, ...)
    floppy.js              Files on the OS's floppy (day 18 on) and where they are in memory
  models/                  State and rules. No DOM access.
    LayoutModel.js         Panel sizes, limits, persistence
    MachineModel.js        Current chapter and step, and the merged hardware state
    MemoryModel.js         Regions, their state, known bytes, and the step focus
    AboutModel.js          Whether this visitor has seen the About dialog
  views/                   DOM rendering and user input. No app state.
    LayoutView.js          Splitter drag/keyboard input, CSS variable output
    FrontPanelView.js      Power button and LEDs
    PlayerView.js          Play/pause, step buttons, progress bar, milestones, keys
    ChapterView.js         Chapter picker
    RouteView.js           URL hash (#day0/5) for links and reloads
    LessonView.js          Current step explanation
    BoardView.js           Motherboard diagram (signals, CPU state)
    VisualView.js          Which diagram the chapter shows; floppy disk highlight
    CodeView.js            Program listing, step focus, next instruction
    DockView.js            MEMORY / CODE / TERMINAL tabs, update dots
    PanelPulseView.js      Lights up the display heading when a step changes it
    RegisterView.js        CPU register table
    DisplayView.js         Monitor: text screen, or graphics drawn through the palette
    TableDiagramView.js    Table diagrams in the explanation (palette, IDT, ...)
    PicView.js             Interrupt controllers: IRQ inputs, masks, vectors
    FifoView.js            Ring buffers: slots and read/write positions
    TimelineView.js        Timelines: interrupts, timers, and later tasks over time
    TerminalView.js        TERMINAL tab: debugger log, or the OS console from day 17
    StatusView.js          Status bar
    MemoryView.js          Zoomable grid (pages / 16-byte blocks / bytes) and detail
    AboutView.js           ABOUT button and dialog
  controllers/             Connect views to models. No DOM, no state.
    LayoutController.js
    MachineController.js   Input -> chapter and step; step -> every view; playback timing
    MemoryController.js
    AboutController.js     Opens About on request and once on the first visit
```

## Chapters and steps

The tutorial is split into chapters, one per day, listed in
`js/data/chapters/index.js`; each day lives in its own file such as
`day00.js`. A chapter is a list of steps. Each step has a title, a
plain-language summary, a technical detail paragraph, an approximate time,
and a `state` patch. `MachineModel` merges the patches in order, so any step
can be shown on its own. Step 0 of every chapter holds its full starting
state, so a chapter opens directly without replaying the ones before it:
day 0 starts switched off, and later days start with the machine already
running.

Each chapter shows the diagram that matters to it in the explanation panel
(the motherboard on day 0, the floppy disk on days 1 and 3, the GDT on
day 3, and from day 4 tables built from the step's data, such as the
palette). Under the display, each step opens the MEMORY, CODE, or TERMINAL tab
it is about. CODE lists the program with its address, bytes, source, and
comment, highlights the lines the step is about, and marks the instruction
the CPU runs next with ▶. Tapping a code line, an address in the
explanation, or CS base / EIP in the register table opens MEMORY at that
byte. When a step changes a tab that is not showing, the tab gets a dot
until it is opened; the display heading lights up when the screen changes.

The chapter picker on the front panel lists every day; days without steps
yet show as coming soon. The URL hash follows the current chapter and step
(`#day0/5`), so links and reloads open the same place.

### Player

Next to the power button, the front panel has a video-player style control:
play/pause advances one step every 2.5 seconds, the
step buttons move one step at a time, and the single progress bar can be clicked
or dragged to jump to any step. Keyboard: Space plays or pauses, Left and
Right step back and forward. Steps with a `milestone` (such as
"BIOS done" at the end of day 0) get a labeled diamond on the bar and a badge
above their title. The player stays disabled until the power
button is pressed, and the bar starts at A1 (standby comes before power).

### Day 0

| Phase | Steps | What happens |
|---|---|---|
| A · Power on | A0–A4 | Standby, power button, `PS_ON#`, voltage ramp, `PWR_OK` and reset release |
| B · CPU reset | B1–B3 | Register reset values, reset vector `0xFFFFFFF0`, far jump to `F000:E05B` |
| C · Power-on self test | C1–C10 | ROM checksum, support chips, RAM tests, interrupt vector table, BIOS data area, video BIOS and the first text screen, keyboard controller, drives, beep |
| D · Load the boot sector | D1–D4 | INT 19h, read sector 1 to `0x7C00`, check `55 AA`, jump to `0000:7C00` where day 1 begins |

Steps can also fill memory (`writes`), mark RAM as tested (`ranges`), and put
text on the 80 × 25 screen (`screen`); the text is written into video memory
at `0xB8000` too, so it shows up in the memory grid. In step text, an address
in braces such as `{0x7C00}` or `{F000:E05B}` becomes a link that zooms the
memory panel to that byte.

The memory panel is a true-scale 16 × 16 grid with three zoom levels: 4 KiB
pages over the whole map, 16-byte blocks inside one page, and single bytes
(a hex dump) inside a 256-byte block. Tapping a cell zooms in and the trail
above the grid zooms back out. A step's memory focus can name a byte range
(`focus.bytes`), and the panel zooms to it on its own.

From day 4, a step can also set `graphics`, the picture in video memory as a
list of drawing operations (with `width`, `height`, and `base`, the address
of video memory, for modes other than 320 × 200 at 0xA0000): fill, box,
pattern, text, bitmap; see `js/core/raster.js`. `palette` picks the colors
(`vga` or `os`). The display and the
memory panel read the same bytes, so the screen always matches memory.
`table` fills a table diagram (`visual: 'table'`), `pic` the interrupt
controller diagram (`visual: 'pic'`), `fifo` a ring buffer
(`visual: 'fifo'`), `timeline` a timeline (`visual: 'timeline'`),
`terminal` fills the
TERMINAL tab (with `console: true` it mirrors the OS console window), and `memory.layout` adds regions the OS sets up, such as its
tables above 1 MiB. A write may give `fill` to set every byte of its range
first, so a large table cleared to zero needs no byte list, and `graphics`
fills it with the pixels of a drawing list, for an off-screen buffer such as
a layer. `marks` outlines rectangles on the graphics screen, such as the area
a step redraws; marks are drawn over the screen, not into memory. Setting an entry
of `writes`, `ranges`, or `regs` to `null` removes it.

To add a day, create `js/data/chapters/dayNN.js` exporting a chapter
(`{ id, title, name, steps }`) and put it in `CHAPTERS` in place of its
coming-soon entry. A new kind of hardware state needs a field in the
chapter's step 0 and a view that renders it.

## Code rules

- **Models** hold state and emit `change` events. They never touch the DOM.
- **Views** render what they're given and emit user-intent events
  (`resize`, `reset`, ...). They never change state directly.
- **Controllers** subscribe to both sides: view events call model methods,
  model events call view render methods.
- One file per class, named after the class.

## Adding a feature

The memory map panel was added this way:

1. `js/models/MemoryModel.js`: the memory regions and their state
2. `js/views/MemoryView.js`: draws into `#memory .panel-body`
3. `js/controllers/MemoryController.js`: connects the two
4. Construct the trio in `js/main.js`
5. Put panel-specific styles in a new `css/memory.css` and link it from
   `index.html`

See [ROADMAP.md](ROADMAP.md) for the plan covering the whole book. New physical
controls (reset button, disk LED, ...) go on the front panel in
`FrontPanelView`.

## Analytics

The published site counts page views with
[GoatCounter](https://www.goatcounter.com/), which uses no cookies and
collects no personal data. Visits from `localhost` are not counted.

## Credits

This project follows the structure of *30日でできる! OS自作入門* by Hidemi
Kawai (川合秀実), published in Chinese as *30天自制操作系统*. It is an
unofficial companion and is not affiliated with or endorsed by the author
or the publishers. The explanations, diagrams, and code here are written
for this project; read the book for the full material.
