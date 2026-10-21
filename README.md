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

It is an unofficial companion, not affiliated with the author or the
publishers; see [Credits](#credits).

## Layout

The boot explanation (steps, motherboard diagram, CPU registers) fills the
left half. The right half stacks a display (the machine's screen), a memory
map, and a terminal (reserved for typing CPU commands in a later chapter) at
a 1 : 2 : 1 ratio. Every splitter can be dragged.

## Running locally

The scripts are ES modules, so browsers won't load them from `file://`.
Serve the folder over HTTP instead:

```bash
python3 -m http.server 8123
```

Then open <http://localhost:8123/>.

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
  dock.css                 CODE / TERMINAL tabs and the code listing
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
  data/                    Static facts the models load (no logic)
    chapters/
      index.js             Chapter list: day 0 plus the book's 30 days
      day00.js             Day 0 steps: text, timing, and hardware state patches
      day01.js             Day 1: inside the boot sector, then running it
    programs/
      assemble.js          Write programs as data: source, bytes, comments
      helloBoot.js         Day 1's boot sector
      index.js             Programs a step can show in the code panel
    memoryMap.js           Memory map regions and the ROM bytes the tutorial shows
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
    DockView.js            CODE / TERMINAL tabs
    PanelPulseView.js      Lights up a panel heading when a step changes it
    RegisterView.js        CPU register table
    DisplayView.js         Monitor
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
(the motherboard on day 0, the floppy disk on day 1). The panel under memory
has CODE and TERMINAL tabs: CODE lists the program in memory with its
address, bytes, source, and comment, highlights the lines the step is about,
and marks the instruction the CPU runs next with ▶; tapping a line shows its
bytes in memory. When a step changes what the display, memory, or code
panel shows, that panel's heading lights up briefly.

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

Next: day 1 of the book, the contents of the boot sector. See
[ROADMAP.md](ROADMAP.md) for the plan covering the whole book. New physical
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
