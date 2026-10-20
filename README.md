# os-tutorial

A browser-based visualizer for following along with Hidemi Kawai's book
*30日でできる! OS自作入門* (Chinese edition: *30天自制操作系统*). The boot
explanation (steps, motherboard diagram, CPU registers) fills the left half. The right half stacks a display (the
machine's screen), a memory map, and a terminal (reserved for typing CPU
commands in a later chapter) at a 1 : 2 : 1 ratio. Every splitter can be
dragged.

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
index.html                 Markup only: page frame, four panels, motherboard SVG
css/
  base.css                 Design tokens (colors, sizes) and resets
  layout.css               Page frame, split areas, responsive rules
  panels.css               Panel chrome and splitters
  player.css               Video-player controls on the front panel
  front-panel.css          Power button and LEDs
  display.css              Display panel drawn as a monitor
  terminal.css             Terminal panel (placeholder)
  memory.css               Zoomable page grid, zoom trail, detail line, legend
  lesson.css               Step explanation and register table
  board.css                Motherboard diagram signal states
js/
  main.js                  Entry point: builds and starts each trio
  core/
    EventEmitter.js        Shared pub/sub for models and views
  data/                    Static facts the models load (no logic)
    bootSteps.js           Boot steps: text, timing, and hardware state patches
    memoryMap.js           Memory map regions and the ROM bytes the tutorial shows
  models/                  State and rules. No DOM access.
    LayoutModel.js         Panel sizes, limits, persistence
    MachineModel.js        Current boot step and the merged hardware state
    MemoryModel.js         Regions, their state, known bytes, and the step focus
  views/                   DOM rendering and user input. No app state.
    LayoutView.js          Splitter drag/keyboard input, CSS variable output
    FrontPanelView.js      Power button and LEDs
    PlayerView.js          Play/pause, step buttons, progress track, speed, keys
    LessonView.js          Current step explanation
    BoardView.js           Motherboard diagram (signals, CPU state)
    RegisterView.js        CPU register table
    DisplayView.js         Monitor
    StatusView.js          Status bar
    MemoryView.js          Zoomable grid (pages / 16-byte blocks / bytes) and detail
  controllers/             Connect views to models. No DOM, no state.
    LayoutController.js
    MachineController.js   Input -> machine steps; step -> every view; playback timing
    MemoryController.js
```

## Boot sequence

The tutorial plays the boot process as a list of steps in
`js/data/bootSteps.js`. Each step has a title, a plain-language summary, a
technical detail paragraph, an approximate time, and a `state` patch.
`MachineModel` merges the patches in order, so any step can be shown on its
own.

Next to the power button, the front panel has a video-player style control:
play/pause advances one step every 5 seconds (0.5×, 1×, or 2× speed), the
step buttons move one step at a time, and the single progress bar can be clicked
or dragged to jump to any step. Keyboard: Space plays or pauses, Left and
Right step back and forward. The player stays disabled until the power
button is pressed, and the bar starts at A1 (standby comes before power).

| Phase | Steps | What happens |
|---|---|---|
| A · Power on | A0–A4 | Standby, power button, `PS_ON#`, voltage ramp, `PWR_OK` and reset release |
| B · CPU reset | B1–B3 | Register reset values, reset vector `0xFFFFFFF0`, far jump to `F000:E05B` |

The memory panel is a true-scale 16 × 16 grid with three zoom levels: 4 KiB
pages over the whole map, 16-byte blocks inside one page, and single bytes
(a hex dump) inside a 256-byte block. Tapping a cell zooms in and the trail
above the grid zooms back out. A step's memory focus can name a byte range
(`focus.bytes`), and the panel zooms to it on its own.

To add steps, append them to `BOOT_STEPS`. A new kind of hardware state needs
a field in the A0 base state and a view that renders it.

### Rules

- **Models** hold state and emit `change` events. They never touch the DOM.
- **Views** render what they're given and emit user-intent events
  (`resize`, `reset`, ...). They never change state directly.
- **Controllers** subscribe to both sides: view events call model methods,
  model events call view render methods.
- One file per class, named after the class.

### Adding a feature

The memory map panel was added this way:

1. `js/models/MemoryModel.js`: the memory regions and their state
2. `js/views/MemoryView.js`: draws into `#memory .panel-body`
3. `js/controllers/MemoryController.js`: connects the two
4. Construct the trio in `js/main.js`
5. Put panel-specific styles in a new `css/memory.css` and link it from
   `index.html`

Next phases: C · POST (BIOS self test) and D · loading the boot sector to
`0x7C00`, where day 1 of the book begins. See [ROADMAP.md](ROADMAP.md) for
the plan covering the whole book. New physical controls (reset
button, disk LED, ...) go on the front panel in `FrontPanelView`.

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
