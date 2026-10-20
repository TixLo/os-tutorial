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
index.html                 Markup only: page frame and panel containers
css/
  base.css                 Design tokens (colors, sizes) and resets
  layout.css               Page frame, split areas, responsive rules
  panels.css               Panel chrome and splitters
  front-panel.css          Power button and LEDs
  memory.css               Memory map rows, region states, legend
js/
  main.js                  Entry point: builds and starts each trio
  core/
    EventEmitter.js        Shared pub/sub for models and views
  data/                    Static facts the models load (no logic)
    memoryMap.js           Real-mode 1 MiB memory map regions
  models/                  State and rules. No DOM access.
    LayoutModel.js         Panel sizes, limits, persistence
    MachineModel.js        Machine power state
    MemoryModel.js         Memory regions and their power-dependent state
  views/                   DOM rendering and user input. No app state.
    LayoutView.js          Splitter drag/keyboard input, CSS variable output
    FrontPanelView.js      Front panel buttons and LEDs
    MemoryView.js          Memory map rows
  controllers/             Connect views to models. No DOM, no state.
    LayoutController.js
    MachineController.js   Front panel -> machine, machine power -> memory
    MemoryController.js
```

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

Planned trios: `Console`, `Boot` (steps, processes, time),
and `Toolbar` (day select, run, pause, step). New physical controls
(reset button, disk LED, ...) go on the front panel in `FrontPanelView`.
