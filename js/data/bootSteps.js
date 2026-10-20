// Boot sequence from pressing the power button to the boot sector taking over at 0x7C00,
// where day 1 of the book begins. Modeled on a classic PC/AT BIOS (SeaBIOS under QEMU,
// as used by the book); timings are rough.
//
// Each step's `state` is a patch merged onto the previous step's state, one level deep,
// so keyed objects like `writes` and `ranges` build up from step to step.
//   writes  memory the BIOS fills in: { start, end, data: [[address, [bytes]], ...] }
//   ranges  RAM marked with a state over an address range, e.g. tested by POST
//   screen  lines of text on the 80 x 25 text screen
//
// In summary, detail, and formula text, a memory address in braces, like {0x7C00} or
// {F000:E05B}, becomes a link that shows that byte in the memory panel.

export const PHASES = Object.freeze({
  A: 'Power on',
  B: 'CPU reset',
  C: 'Power-on self test',
  D: 'Load the boot sector',
});

// Interrupt vectors are offset:segment pairs, stored low byte first.
const vector = (segment, offset) => [offset & 0xFF, offset >> 8, segment & 0xFF, segment >> 8];

// Standard IBM PC entry points inside the BIOS (SeaBIOS keeps the same addresses).
// Every other vector points at a handler that just returns (IRET at F000:FF53).
const BIOS_HANDLERS = {
  0x08: 0xFEA5,  // timer tick
  0x09: 0xE987,  // keyboard
  0x10: 0xF065,  // video (replaced once the video BIOS starts)
  0x13: 0xE3FE,  // disk
  0x16: 0xE82E,  // keyboard input
  0x19: 0xE6F2,  // bootstrap loader
  0x1A: 0xFE6E,  // time of day
};
const IVT_BYTES = Array.from({ length: 256 }, (_, n) => vector(0xF000, BIOS_HANDLERS[n] || 0xFF53)).flat();

const RESET_REGS = {
  'CS':           { value: 'F000',     note: 'Code segment: which block of memory the code is in' },
  'CS base':      { value: 'FFFF0000', note: 'Hidden part of CS. On reset it points near the top of 4 GiB' },
  'EIP':          { value: '0000FFF0', note: 'Instruction pointer: where the next instruction is, inside CS' },
  'DS / ES / SS': { value: '0000',     note: 'Data and stack segments, all zero' },
  'ESP':          { value: '00000000', note: 'Stack pointer. There is no stack yet' },
  'EFLAGS':       { value: '00000002', note: 'Status flags. IF=0 means interrupts are off' },
  'CR0':          { value: '60000010', note: 'Control bits. PE=0 means real mode; caches are off' },
  'EDX':          { value: '00000663', note: 'CPU model ID (the value depends on the CPU)' },
};

export const BOOT_STEPS = Object.freeze([
  {
    id: 'A0',
    phase: 'A',
    title: 'Standby',
    summary: 'The computer is plugged in but switched off.',
    detail: 'Even when "off", the power supply sends a small 5 V standby current to the ' +
      'motherboard. It is just enough to keep one tiny circuit in the chipset awake, ' +
      'watching the power button. The CPU, the memory, and the screen get no power at all.',
    hint: 'Press the power button on the front panel to start.',
    time: '—',
    state: {
      signals: { pwrsw: false, pson: false, rails: 'off', pwrok: false, reset: 'idle', bus: false, disk: false },
      led: false,
      cpu: 'off',
      regs: null,
      memory: { powered: false, focus: null },
      writes: {},
      ranges: {},
      monitor: 'off',
      screen: [],
      csip: '—',
    },
  },
  {
    id: 'A1',
    phase: 'A',
    title: 'Power button pressed',
    summary: 'Pressing the button closes a small switch on the motherboard.',
    detail: 'The power button is not wired to the power supply. It is a push switch ' +
      'connected to two pins on the motherboard labeled PWR_SW. Pressing it sends a short ' +
      'pulse to the chipset, the motherboard\'s traffic controller, which is running on ' +
      'standby power.',
    time: '0 ms',
    state: {
      signals: { pwrsw: true },
    },
  },
  {
    id: 'A2',
    phase: 'A',
    title: 'Chipset asks for power',
    summary: 'The chipset tells the power supply to switch on.',
    detail: 'The chipset pulls a wire called PS_ON# down to 0 volts. The "#" means ' +
      '"active low": the signal counts as ON when the wire is low. This is the power ' +
      'supply\'s cue to turn on its main outputs.',
    time: '≈ 1 ms',
    state: {
      signals: { pwrsw: false, pson: true },
    },
  },
  {
    id: 'A3',
    phase: 'A',
    title: 'Voltages ramp up',
    summary: 'The power supply brings up its main voltages: 12 V, 5 V, and 3.3 V. ' +
      'The power LED comes on.',
    detail: 'Voltages cannot jump from 0 to full instantly. For a fraction of a second ' +
      'they climb and wobble. The memory chips now have power, but what is inside them is ' +
      'random noise (shown striped as "undefined"). Meanwhile the chipset holds the CPU\'s ' +
      'RESET# wire low, which freezes the CPU so it cannot run on unstable power.',
    time: '≈ 20 ms',
    state: {
      signals: { rails: 'ramping', reset: 'held' },
      led: true,
      cpu: 'reset',
      memory: { powered: true },
      monitor: 'nosignal',
    },
  },
  {
    id: 'A4',
    phase: 'A',
    title: 'Power good',
    summary: 'The voltages are stable. The power supply raises PWR_OK, and the chipset ' +
      'releases the CPU from reset.',
    detail: 'Once every output is steady, the power supply sends PWR_OK ("power good") to ' +
      'the chipset. The chipset waits for exactly this signal, then lets go of RESET#. ' +
      'This is the moment the CPU wakes up.',
    time: '≈ 300 ms',
    state: {
      signals: { rails: 'on', pwrok: true, reset: 'released' },
      cpu: 'starting',
    },
  },
  {
    id: 'B1',
    phase: 'B',
    title: 'CPU starts in a known state',
    summary: 'Every register is forced to a fixed starting value, the same on every boot.',
    detail: 'A CPU coming out of reset remembers nothing. The hardware sets each register ' +
      'to a value printed in the CPU\'s manual (see the table below). It starts in real ' +
      'mode, the 16-bit mode of the original 1981 IBM PC, so even a modern CPU boots ' +
      'pretending to be an old 8086. Interrupts and memory protection are off.',
    time: '≈ 300 ms',
    state: {
      cpu: 'running',
      regs: RESET_REGS,
      csip: 'F000:FFF0',
    },
  },
  {
    id: 'B2',
    phase: 'B',
    title: 'The reset vector',
    summary: 'The CPU fetches its first instruction from {0xFFFFFFF0}, 16 bytes below ' +
      'the top of 4 GiB.',
    detail: 'The address comes from the registers: CS base plus EIP. Nothing in RAM is ' +
      'ready yet, so the first code must come from a chip that already holds data at ' +
      'power-on: the BIOS ROM. The chipset routes this address to the ROM. A fixed ' +
      'starting address like this is called the reset vector.',
    formula: 'CS base {0xFFFF0000} + EIP 0xFFF0 = {0xFFFFFFF0}',
    time: '≈ 300 ms + a few ns',
    state: {
      signals: { bus: true },
      memory: {
        focus: {
          id: 'bios_alias',
          note: 'The CPU fetches from the last 16 bytes below 4 GiB',
          bytes: [0xFFFFFFF0, 0xFFFFFFFF],
        },
      },
    },
  },
  {
    id: 'B3',
    phase: 'B',
    title: 'Jump into the BIOS',
    summary: 'Only 16 bytes fit before the top of memory, so the first instruction is ' +
      'a jump: jmp {F000:E05B}.',
    detail: 'Sixteen bytes are too few for real work, so the ROM puts one far jump there. ' +
      'A far jump reloads CS, and in real mode that sets the CS base to CS × 16. The CPU ' +
      'continues at {0xFE05B}, inside the normal 1 MiB BIOS area (the same ROM appears at ' +
      'both addresses). From here on it runs like an 8086. In the ROM the jump is five ' +
      'bytes: EA is the far-jump opcode, 5B E0 is the offset 0xE05B, and 00 F0 is the ' +
      'segment 0xF000. x86 stores numbers low byte first, which is why they look reversed.',
    formula: 'CS base = 0xF000 × 16 = {0xF0000}      {0xF0000} + 0xE05B = {0xFE05B}',
    time: '≈ 300 ms + a few ns',
    state: {
      regs: {
        'CS base': { value: '000F0000', note: 'Reloaded by the far jump: F000 × 16' },
        'EIP':     { value: '0000E05B', note: 'Entry point of the BIOS startup code' },
      },
      memory: {
        focus: {
          id: 'bios_alias',
          note: 'EA 5B E0 00 F0 is jmp F000:E05B',
          bytes: [0xFFFFFFF0, 0xFFFFFFF4],
        },
      },
      csip: 'F000:E05B',
    },
  },
  {
    id: 'C1',
    phase: 'C',
    title: 'The BIOS checks itself',
    summary: 'The power-on self test (POST) begins. First the BIOS makes sure its own ' +
      'ROM is not damaged.',
    detail: 'The BIOS adds up every byte of its ROM. The chip was built so that the total, ' +
      'kept to its lowest 8 bits, comes out to exactly 0. Any other result means a damaged ' +
      'chip, and the BIOS stops with a beep code, because there is no working screen yet to ' +
      'print an error on. All of POST runs from the ROM; RAM is still untouched.',
    time: '≈ 0.3 s',
    state: {
      regs: {
        'EIP': { value: '0000····', note: 'Somewhere inside the BIOS POST code' },
      },
      memory: { focus: { id: 'system_bios', note: 'Every byte of the BIOS ROM is added up' } },
      csip: 'F000:····',
    },
  },
  {
    id: 'C2',
    phase: 'C',
    title: 'Set up the support chips',
    summary: 'The BIOS programs the chips the CPU relies on: the interrupt controller, ' +
      'the timer, and the DMA controller.',
    detail: 'The PIC (8259) collects signals from devices such as the keyboard and turns ' +
      'them into interrupts for the CPU. The PIT (8254) ticks about 18.2 times a second ' +
      'and also drives the speaker. The DMA controller (8237) moves data, like floppy ' +
      'sectors, into memory without the CPU copying each byte. The BIOS talks to all of ' +
      'them through I/O ports, a separate address space from memory.',
    time: '≈ 0.35 s',
    state: {
      memory: { focus: null },
    },
  },
  {
    id: 'C3',
    phase: 'C',
    title: 'Test the first 64 KiB of RAM',
    summary: 'Before the BIOS can store anything, it checks that the bottom of memory ' +
      'really works.',
    detail: 'The BIOS writes test patterns into each byte and reads them back. It only ' +
      'tests the first 64 KiB for now, because it needs a little RAM it can trust for its ' +
      'own tables and for a stack. The bytes still hold leftover test patterns afterwards, ' +
      'so they stay "??".',
    time: '≈ 0.4 s',
    state: {
      ranges: { low: { start: 0x00000, end: 0x0FFFF, state: 'tested' } },
      memory: { focus: { id: 'free_low', note: 'The first 64 KiB passes the test', range: [0x00000, 0x0FFFF] } },
    },
  },
  {
    id: 'C4',
    phase: 'C',
    title: 'Build the interrupt vector table',
    summary: 'The BIOS fills the first 1 KiB of memory with 256 addresses, one for each ' +
      'interrupt number.',
    detail: 'In real mode, interrupt n makes the CPU read 4 bytes at address n × 4 and ' +
      'jump there. Each entry is an offset and a segment, low byte first. INT 13h, the ' +
      'disk service the boot sector will use, sits at {0x4C} and points to {F000:E3FE} in the ' +
      'BIOS. Numbers nobody handles point at {F000:FF53}, a single "return" instruction.',
    formula: 'INT 13h → address 0x13 × 4 = {0x4C} → FE E3 00 F0 → {F000:E3FE}',
    time: '≈ 0.45 s',
    state: {
      writes: { ivt: { start: 0x00000, end: 0x003FF, data: [[0x00000, IVT_BYTES]] } },
      memory: { focus: { id: 'ivt', note: 'Vector 13h (disk) at 0x0004C', bytes: [0x0004C, 0x0004F] } },
    },
  },
  {
    id: 'C5',
    phase: 'C',
    title: 'Fill in the BIOS data area',
    summary: 'Right after the vector table, the BIOS writes down what hardware it found.',
    detail: 'The 256 bytes at {0x400} are the BIOS data area: serial port addresses, ' +
      'keyboard state, screen mode, and more. At {0x413} it stores the base memory size in ' +
      'KiB: 0x027F = 639. That is 640 KiB minus the 1 KiB the BIOS keeps for itself at ' +
      '{0x9FC00} (the extended BIOS data area), whose segment, 0x9FC0, is stored at {0x40E}.',
    formula: '{0x413}: 7F 02 → 0x027F = 639 KiB',
    time: '≈ 0.5 s',
    state: {
      writes: {
        bda: {
          start: 0x00400, end: 0x004FF,
          data: [[0x00400, [0xF8, 0x03]], [0x0040E, [0xC0, 0x9F]], [0x00413, [0x7F, 0x02]]],
        },
      },
      memory: { focus: { id: 'bda', note: 'Base memory size at 0x413', bytes: [0x00413, 0x00414] } },
    },
  },
  {
    id: 'C6',
    phase: 'C',
    title: 'Start the video card',
    summary: 'The BIOS finds the video card\'s own ROM at {0xC0000} and runs it. ' +
      'The screen shows text for the first time.',
    detail: 'Expansion cards can carry their own small BIOS, called an option ROM. The ' +
      'BIOS looks for one at {0xC0000} by checking for the bytes 55 AA; the next byte is its ' +
      'size in 512-byte blocks. The video BIOS sets the screen to 80 × 25 text mode, where ' +
      'each character on screen is 2 bytes at {0xB8000}: the character code and its color. ' +
      'It also points INT 10h (the vector at {0x40}) at its own code in segment C000.',
    formula: '55 AA = option ROM signature      40 = 64 × 512 bytes = 32 KiB',
    time: '≈ 0.6 s',
    state: {
      writes: { int10: { start: 0x00040, end: 0x00043, data: [[0x00042, [0x00, 0xC0]]] } },
      memory: { focus: { id: 'video_bios', note: 'Option ROM signature at 0xC0000', bytes: [0xC0000, 0xC0002] } },
      monitor: 'text',
      screen: ['PC BIOS (simulated for this tutorial)', ''],
    },
  },
  {
    id: 'C7',
    phase: 'C',
    title: 'Test the rest of memory',
    summary: 'With a screen available, the BIOS tests the remaining base memory and ' +
      'shows the count as it goes.',
    detail: 'The same write-and-read-back test now covers everything up to {0x9FFFF}. The ' +
      'text on screen is itself just memory: each letter is a byte at {0xB8000} followed by ' +
      'a color byte (07 = light gray on black). Tap the video memory row to find it.',
    time: '≈ 1.0 s',
    state: {
      ranges: { rest: { start: 0x10000, end: 0x9FFFF, state: 'tested' } },
      memory: { focus: { id: 'free_high', note: 'Memory up to 0x9FFFF passes the test', range: [0x10000, 0x9FFFF] } },
      screen: ['PC BIOS (simulated for this tutorial)', '', 'Memory test: 640K OK'],
    },
  },
  {
    id: 'C8',
    phase: 'C',
    title: 'Check the keyboard controller',
    summary: 'The BIOS asks the keyboard controller to test itself.',
    detail: 'It sends command AA to the keyboard controller (an 8042 chip) through I/O ' +
      'port 0x64. The controller runs its own self-test and answers 55 on port 0x60 if ' +
      'everything is fine.',
    time: '≈ 1.2 s',
    state: {
      memory: { focus: null },
      screen: ['PC BIOS (simulated for this tutorial)', '', 'Memory test: 640K OK',
        'Keyboard controller: OK'],
    },
  },
  {
    id: 'C9',
    phase: 'C',
    title: 'Find the drives',
    summary: 'The BIOS looks for disk drives and finds a 1.44 MB floppy drive A:.',
    detail: 'A 1.44 MB floppy has 80 cylinders, 2 heads (one per side), and 18 sectors of ' +
      '512 bytes per track: 80 × 2 × 18 × 512 = 1,474,560 bytes. The book\'s OS lives on ' +
      'exactly this kind of disk image.',
    formula: '80 cylinders × 2 heads × 18 sectors × 512 bytes = 1,474,560 bytes',
    time: '≈ 1.5 s',
    state: {
      screen: ['PC BIOS (simulated for this tutorial)', '', 'Memory test: 640K OK',
        'Keyboard controller: OK', 'Floppy drive A: 1.44 MB'],
    },
  },
  {
    id: 'C10',
    phase: 'C',
    title: 'POST complete',
    summary: 'Every check passed. One short beep from the speaker says so.',
    detail: 'The beep is made by the timer chip from step C2, wired to the PC speaker. A ' +
      'pattern of beeps instead would name the part that failed, which is how a PC reports ' +
      'errors that happen before the screen works.',
    time: '≈ 1.8 s',
    state: {
      screen: ['PC BIOS (simulated for this tutorial)', '', 'Memory test: 640K OK',
        'Keyboard controller: OK', 'Floppy drive A: 1.44 MB', 'POST complete (beep)'],
    },
  },
  {
    id: 'D1',
    phase: 'D',
    title: 'Look for something to boot',
    summary: 'The BIOS calls INT 19h, its bootstrap loader, which tries the boot devices ' +
      'in order. The floppy comes first.',
    detail: 'The BIOS has no idea what an operating system is. Its whole plan is: read the ' +
      'very first sector of a disk into memory and run it. Whatever is in those 512 bytes ' +
      'decides what happens next.',
    time: '≈ 1.9 s',
    state: {
      memory: { focus: { id: 'ivt', note: 'INT 19h jumps through the vector at 0x64', bytes: [0x00064, 0x00067] } },
      screen: ['PC BIOS (simulated for this tutorial)', '', 'Memory test: 640K OK',
        'Keyboard controller: OK', 'Floppy drive A: 1.44 MB', 'POST complete (beep)', '',
        'Booting from Floppy...'],
    },
  },
  {
    id: 'D2',
    phase: 'D',
    title: 'Read the first sector',
    summary: 'The floppy motor spins up and INT 13h reads cylinder 0, head 0, sector 1 ' +
      'into memory at {0x7C00}.',
    detail: 'That is 512 bytes, from {0x7C00} to {0x7DFF}. Why 0x7C00? The original IBM PC ' +
      'had as little as 32 KiB of RAM, and 0x7C00 left 1 KiB at the very top of it for the ' +
      'boot sector and its data, out of the way of the BIOS tables at the bottom. Every PC ' +
      'since has kept the same address.',
    formula: '{0x7C00} + 512 bytes (0x200) = {0x7E00}, so the sector fills {0x7C00}–{0x7DFF}',
    time: '≈ 2.3 s',
    state: {
      signals: { disk: true },
      writes: {
        bootSector: {
          start: 0x07C00, end: 0x07DFF,
          data: [[0x07C00, [0xEB, 0x4E, 0x90]], [0x07DFE, [0x55, 0xAA]]],
        },
      },
      memory: { focus: { id: 'boot_sector', note: '512 bytes copied from the floppy\'s first sector' } },
    },
  },
  {
    id: 'D3',
    phase: 'D',
    title: 'Check the boot signature',
    summary: 'A bootable sector ends with the two bytes 55 AA.',
    detail: 'These are the last two bytes of the sector, at {0x7DFE} and {0x7DFF}. Most BIOSes ' +
      'refuse to run a sector without them, so random data is not executed by mistake ' +
      '(some skip the check for floppies). The other bytes are the book\'s day 1: they ' +
      'are shown as ·· until then.',
    time: '≈ 2.3 s',
    state: {
      signals: { disk: false },
      memory: { focus: { id: 'boot_sector', note: 'Boot signature 55 AA at 0x7DFE', bytes: [0x07DFE, 0x07DFF] } },
    },
  },
  {
    id: 'D4',
    phase: 'D',
    title: 'Jump to 0x7C00',
    summary: 'The BIOS jumps to {0000:7C00}. From now on, the boot sector is in charge.',
    detail: 'DL holds the drive number the sector came from (00 = floppy A:), so the boot ' +
      'code knows where to read the rest of the OS. The first bytes, EB 4E 90, jump over a ' +
      'description of the disk (its size, sectors, and file system) to the real code at ' +
      '{0x7C50}. This is exactly where day 1 of the book begins.',
    formula: 'EB 4E → jump ahead 0x4E bytes from {0x7C02} → {0x7C50}',
    hint: 'Day 1 starts here: what goes inside these 512 bytes.',
    time: '≈ 2.4 s',
    state: {
      signals: { bus: false },
      regs: {
        'CS':      { value: '0000',     note: 'Code segment 0' },
        'CS base': { value: '00000000', note: 'CS × 16 = 0' },
        'EIP':     { value: '00007C00', note: 'The first byte of the boot sector' },
        'EDX':     { value: '00000000', note: 'DL = 00: booted from floppy drive A:' },
      },
      memory: { focus: { id: 'boot_sector', note: 'The CPU runs the boot sector from here', bytes: [0x07C00, 0x07C02] } },
      csip: '0000:7C00',
    },
  },
]);
