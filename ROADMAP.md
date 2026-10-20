# Roadmap

Plan for turning the whole book, *30日でできる! OS自作入門* (Hidemi Kawai), into
step-by-step tutorials on this site. The day-by-day outline below was written
from memory; check chapter titles and details against the book.

Status: **M0, M1, and M2 done** (all of day 0, plus the chapter framework). Everything else is a draft waiting for the open questions
at the bottom to be settled.

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
| **Timers and multitasking** | 12–13 | PIT timer interrupts, timer management and speedups, one FIFO for all events |
| | 14 | High resolution (VBE), keyboard input into a window, blinking cursor |
| | 15–16 | Task switching with TSS, task management, sleep and priorities |
| **Console and applications** | 17–18 | Console window, `mem` / `cls` / `dir` commands, reading FAT12 directories |
| | 19–20 | Run the first application, API through INT 0x40 system calls |
| | 21–22 | Protect the OS from applications (exceptions), write applications in C |
| **Finishing touches** | 23–26 | Drawing APIs, switching and moving windows, timer API, sound, multiple consoles |
| | 27 | LDT, libraries |
| | 28 | File API, command-line arguments, Japanese text |
| | 29–30 | Compression, applications (calculator, text viewer, music player, image viewer) |

## 2. How the OS runs on the site

Later days execute far too many instructions (interrupts, multitasking,
applications) to hand-write the state of every step. Three options:

| Approach | What it means | Fits |
|---|---|---|
| **Scripted steps** (current) | Every step's registers, memory, and screen are written as data | Days 0–2: concept-heavy, few steps |
| **Real emulator** | Run an x86 emulator in the browser (for example the open-source v86) on the real disk image, and read memory, registers, and the screen from it | Day 3 onward: complex code, needs keyboard and mouse |
| **Hybrid** (recommended) | Scripted steps explain each concept; at the end of each day, switch to "run it" and boot that day's build in the emulator | The whole book |

Before using an emulator, confirm which one and that its license allows this.
The book's accompanying code has the author's own license; confirm whether it
may be used here. Until then, all code on the site is written for this project
and nothing is copied from the book.

## 3. Milestones

| # | Milestone | Content | New features needed |
|---|---|---|---|
| **M0** | ✅ Done | First half of day 0: power-on to the CPU's first instruction (phases A and B) | — |
| **M1** | ✅ Done: finish day 0 | Phase C, POST (memory test, IVT, BDA, video BIOS puts up the first screen); phase D, load the boot sector to `0x7C00` | Display shows the BIOS text screen; memory gets real byte contents |
| **M2** | ✅ Done: chapter framework | Split step data into one file per day, add a chapter picker, link straight to any chapter and step | Chapter system |
| **M3** | Days 1–2 | What every byte of the boot sector means (BPB, code, `55 AA`), printing with INT 10h, how assembly maps to machine code | **Code panel** that highlights the line being run; **floppy panel** (cylinders, heads, sectors) |
| **M4** | Day 3 | The disk read loop, video mode switch, GDT and CR0, moving from real mode to protected mode | CPU mode and segment visualization; start wiring in the emulator |
| **M5** | Days 4–5 | Drawing into VRAM, palette, fonts | Display supports 320×200 graphics mode |
| **M6** | Days 6–8 | PIC, interrupts, keyboard and mouse | **Devices panel** (PIC, keyboard controller); keyboard and mouse input on the display |
| **M7** | Days 9–11 | Memory management, layers, windows | Memory panel shows allocations and frees |
| **M8** | Days 12–16 | Timers, multitasking | What's happening panel shows the task list and a timeline |
| **M9** | Days 17–22 | Console, FAT12, applications, API, protection | **Terminal panel becomes the OS console**; floppy panel shows FAT12 |
| **M10** | Days 23–30 | Remaining APIs and applications | Mostly "run it" plus highlights instead of step-by-step breakdowns |

## 4. Structure of each day

Every chapter follows the same shape so readers know what to expect:

1. **Goal**: what this day builds (a screenshot or animation)
2. **Concept steps**: like phases A and B, watch the hardware and memory change one step at a time
3. **Code walkthrough**: the key lines, shown next to memory and registers
4. **Run it**: boot this day's result in the emulator and type commands in the terminal

## 5. Open questions

1. **Chapter order**: follow the book day by day, or merge or skip some days?
   For example, days 29–30 are mostly applications and could be covered by
   highlights only.
2. **How to run the OS**: scripted steps, emulator, or hybrid?
3. **Level of detail**: break the early days (boot, protected mode) into very
   fine steps and cover later days with "run it" plus highlights?
4. **Terminal**: a debugger (single step, show registers, dump memory), the OS's
   own console from day 17 on, or both?
