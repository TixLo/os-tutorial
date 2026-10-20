# os-tutorial

A browser-based visualizer for following along with *30 Days to Build an OS*
(Hidemi Kawai). It shows a console, a memory map, and the boot steps,
processes, and timing side by side.

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
index.html                 Markup only: page frame, panels, motherboard SVG
css/
  base.css                 Design tokens (colors, sizes) and resets
  layout.css               Page frame, split areas, responsive rules
  panels.css               Panel chrome and splitters
  toolbar.css              Chapter label and playback buttons
  front-panel.css          Power button and LEDs
  console.css              Console panel drawn as a monitor
  memory.css               Memory map rows, region states, legend
  lesson.css               Step list, explanation, register table
  board.css                Motherboard diagram signal states
js/
  main.js                  Entry point: builds and starts each trio
  core/
    EventEmitter.js        Shared pub/sub for models and views
  data/                    Static facts the models load (no logic)
    bootSteps.js           Boot steps: text, timing, and hardware state patches
    memoryMap.js           Memory map regions (1 MiB plus the reset vector area)
  models/                  State and rules. No DOM access.
    LayoutModel.js         Panel sizes, limits, persistence
    MachineModel.js        Current boot step and the merged hardware state
    MemoryModel.js         Memory regions, their state, and focus notes
  views/                   DOM rendering and user input. No app state.
    LayoutView.js          Splitter drag/keyboard input, CSS variable output
    FrontPanelView.js      Power button and LEDs
    ToolbarView.js         Back / Next step / Auto play
    LessonView.js          Step list and current step explanation
    BoardView.js           Motherboard diagram (signals, CPU state)
    RegisterView.js        CPU register table
    ConsoleView.js         Monitor
    StatusView.js          Status bar
    MemoryView.js          Memory map rows
  controllers/             Connect views to models. No DOM, no state.
    LayoutController.js
    MachineController.js   Input -> machine steps; step -> every view; auto play
    MemoryController.js
```

## Boot sequence

The tutorial plays the boot process as a list of steps in
`js/data/bootSteps.js`. Each step has a title, a plain-language summary, a
technical detail paragraph, an approximate time, and a `state` patch.
`MachineModel` merges the patches in order, so any step can be shown on its
own (Back and the step list jump freely).

| Phase | Steps | What happens |
|---|---|---|
| A · Power on | A0–A4 | Standby, power button, `PS_ON#`, voltage ramp, `PWR_OK` and reset release |
| B · CPU reset | B1–B3 | Register reset values, reset vector `0xFFFFFFF0`, far jump to `F000:E05B` |

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
`0x7C00`, where day 1 of the book begins. New physical controls (reset
button, disk LED, ...) go on the front panel in `FrontPanelView`.
