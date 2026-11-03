# Roadmap

Plan for turning the whole book, *30日でできる! OS自作入門* (Hidemi Kawai), into
step-by-step tutorials on this site. The day-by-day outline below was written
from memory; check chapter titles and details against the book.

Status: **M0 to M8a done** (days 0 to 12, plus the chapter framework). Next:
**M8b** (day 13). The open questions are settled; see [Decisions](#5-decisions).

## 1. Book outline

| Part | Day | Main content |
|---|---|---|
| **Boot and 32-bit mode** | 1 | Hand-write a boot sector in a binary editor that prints hello world; rewrite it in assembly |
| | 2 | Assembly basics (registers, instructions), turn it into an IPL, start using a Makefile |
| | 3 | IPL reads the floppy with INT 13h (cylinders, heads, sectors, retries) and jumps to haribote.sys at `0xC200`; switch video mode, enter 32-bit protected mode, start writing C |
| **Screen and input** | 4 | Draw by writing VRAM (`0xA0000`) from C, set up the palette |
| | 5 | Structs, fonts and text output, mouse cursor, GDT/IDT setup |
| | 6 | Split compilation, PIC setup, interrupt handlers (keyboard, mouse) |
| | 7 | FIFO buffers, enable the mouse, receive keyboard and mouse data |
| | 8 | Decode mouse packets and move the cursor; the protected-mode switch in detail (A20, CR0) |
| **Memory and layers** | 9 | Measure memory size, memory management (allocate, free) |
| | 10 | Manage memory in 4 KiB units, sheet (layer) management |
| | 11 | Windows, faster layer refresh, no flicker |
| **Timers and multitasking** | 12 | PIT timer interrupts, timer management |
| | 13 | Faster timers, one FIFO for all events |
| | 14 | High resolution (VBE), keyboard input into a window, blinking cursor |
| | 15 | Task switching with TSS |
| | 16 | Task management, sleep and priorities |
| **Console and applications** | 17 | Console window and keyboard input to it |
| | 18 | `mem` / `cls` / `dir` commands, reading FAT12 directories |
| | 19 | Load a file and run the first application |
| | 20 | API: system calls through INT 0x40 |
| | 21 | Protect the OS from applications (exceptions) |
| | 22 | Write applications in C |
| **Finishing touches** | 23 | Drawing APIs (points, lines), closing windows |
| | 24 | Switching and moving windows, timer API |
| | 25 | Sound, more colors, multiple consoles |
| | 26 | Faster window moves, opening and closing consoles |
| | 27 | LDT, libraries |
| | 28 | File API, command-line arguments, Japanese text |
| | 29 | Compression, small applications |
| | 30 | Larger applications (calculator, text viewer, music player, image viewer) |

## 2. How the OS runs on the site

**Decided: scripted steps with simplified teaching code, no emulator.** The
site exists to teach what happens, not to ship an OS that boots, so:

- Every step's registers, memory, and screen are written as data, as on
  days 0 to 2.
- Programs are written for this site. Days 1 and 2 use a complete boot
  sector, byte for byte. From day 3 on, programs are simplified: the
  structure, BIOS calls, key instructions, addresses, and numbers are real,
  but only the lines being taught show their bytes, and the code is not a
  complete system you can assemble and boot.
- Long loops are walked through once and then summarized (for example the
  disk read loop on day 3), with memory and diagrams showing the result.
- Nothing is copied from the book's own code.

An emulator (for example v86) could still be added later as an optional "run
it" view, but it is not planned.

## 3. Milestones

Each milestone covers one day. Days that share a theme share a number with a
letter per day (M3a, M3b, ...), and a new panel or feature is built in the
first milestone that needs it.

| # | Milestone | Content | New features needed |
|---|---|---|---|
| **M0** | ✅ Done | First half of day 0: power-on to the CPU's first instruction (phases A and B) | — |
| **M1** | ✅ Done: finish day 0 | Phase C, POST (memory test, IVT, BDA, video BIOS puts up the first screen); phase D, load the boot sector to `0x7C00` | Display shows the BIOS text screen; memory gets real byte contents |
| **M2** | ✅ Done: chapter framework | Split step data into one file per day, add a chapter picker, link straight to any chapter and step | Chapter system |
| **M3a** | ✅ Done: day 1 | What every byte of the boot sector means (BPB, code, `55 AA`), printing hello world with INT 10h | **Code panel** that highlights the line being run; **floppy panel** (cylinders, heads, sectors) |
| **M3b** | ✅ Done: day 2 | The same program in assembly, how assembly maps to machine code, the IPL | — |
| **M4** | ✅ Done: day 3 | The disk read loop, video mode switch, GDT and CR0, moving from real mode to protected mode | CPU mode, GDT table, graphics-mode display, memory above 1 MiB, simplified code listings |
| **M5a** | ✅ Done: day 4 | Drawing into VRAM, palette | Display supports 320×200 graphics mode |
| **M5b** | ✅ Done: day 5 | Fonts and text, mouse cursor, GDT/IDT | — |
| **M6a** | ✅ Done: day 6 | PIC setup, interrupt handlers | **PIC diagram** (IRQ inputs, masks, vectors) |
| **M6b** | ✅ Done: day 7 | FIFO buffers, keyboard and mouse data | Ring buffer diagram; key and mouse bytes on the display |
| **M6c** | ✅ Done: day 8 | Mouse packets, the protected-mode switch in detail | — |
| **M7a** | ✅ Done: day 9 | Memory size check, allocate and free | Memory panel shows allocations and frees |
| **M7b** | ✅ Done: day 10 | 4 KiB memory units, layers | — |
| **M7c** | ✅ Done: day 11 | Windows, layer refresh | — |
| **M8a** | ✅ Done: day 12 | Timer interrupts, timer management | What's happening panel shows a timeline |
| **M8b** | Day 13 | Faster timers, one FIFO for all events | — |
| **M8c** | Day 14 | High resolution, keyboard input into a window | — |
| **M8d** | Day 15 | Task switching with TSS | What's happening panel shows the task list |
| **M8e** | Day 16 | Task management, sleep, priorities | — |
| **M9a** | Day 17 | Console window | **Terminal panel becomes the OS console** |
| **M9b** | Day 18 | Console commands, FAT12 directories | Floppy panel shows FAT12 |
| **M9c** | Day 19 | Running the first application | — |
| **M9d** | Day 20 | System call API | — |
| **M9e** | Day 21 | Protecting the OS, exceptions | — |
| **M9f** | Day 22 | Applications in C | — |
| **M10a–h** | Days 23–30 | One milestone per day: drawing APIs, windows, sound and consoles, speedups, LDT and libraries, files and Japanese text, compression, larger applications | Highlights instead of step-by-step breakdowns |

## 4. Structure of each day

Every chapter follows the same shape so readers know what to expect:

1. **Goal**: what this day builds (a screenshot or animation)
2. **Concept steps**: like phases A and B, watch the hardware and memory change one step at a time
3. **Code walkthrough**: the key lines, shown next to memory and registers
4. **Recap**: a last step that sums up what the day built

## 5. Decisions

Settled on 2026-11-04:

1. **Chapter order**: follow the book one day per chapter, plus this site's day 0.
2. **Level of detail**: days 0 to 8 are broken into fine steps; later days get
   coarser, and days 23 to 30 are highlights of 6 to 10 steps each.
3. **Terminal**: until day 16 it is a debugger view (registers, memory dumps,
   I/O ports); from day 17 it becomes the OS's own console.

## 6. Conventions for later days

- The OS keeps one memory layout from day 3 on: kernel copied to `0x8000`
  onward (starting at `0xC200`), boot info at `0x0FF0`, stack top at `0x90000`,
  IDT at `0x26F800` and GDT at `0x270000` (day 5), memory manager table at
  `0x3C0000` and allocatable memory from `0x400000` (day 9). The machine has
  32 MiB of RAM.
- The font is drawn for this site; nothing is copied from the book's files.
- `node tools/check.mjs` checks every chapter's data and must pass before a
  commit.
