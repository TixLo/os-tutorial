// Boot sequence from pressing the power button to the CPU's first jump into the BIOS.
// Modeled on a classic PC/AT BIOS (SeaBIOS under QEMU, as used by the book).
//
// Each step's `state` is a patch merged onto the previous step's state, one level deep.

export const PHASES = Object.freeze({
  A: 'Power on',
  B: 'CPU reset',
});

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
      signals: { pwrsw: false, pson: false, rails: 'off', pwrok: false, reset: 'idle', bus: false },
      led: false,
      cpu: 'off',
      regs: null,
      memory: { powered: false, focus: null },
      monitor: 'off',
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
    summary: 'The CPU fetches its first instruction from 0xFFFFFFF0, 16 bytes below ' +
      'the top of 4 GiB.',
    detail: 'The address comes from the registers: CS base plus EIP. Nothing in RAM is ' +
      'ready yet, so the first code must come from a chip that already holds data at ' +
      'power-on: the BIOS ROM. The chipset routes this address to the ROM. A fixed ' +
      'starting address like this is called the reset vector.',
    formula: 'CS base 0xFFFF0000 + EIP 0xFFF0 = 0xFFFFFFF0',
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
      'a jump: jmp F000:E05B.',
    detail: 'Sixteen bytes are too few for real work, so the ROM puts one far jump there. ' +
      'A far jump reloads CS, and in real mode that sets the CS base to CS × 16. The CPU ' +
      'continues at 0xFE05B, inside the normal 1 MiB BIOS area (the same ROM appears at ' +
      'both addresses). From here on it runs like an 8086. In the ROM the jump is five ' +
      'bytes: EA is the far-jump opcode, 5B E0 is the offset 0xE05B, and 00 F0 is the ' +
      'segment 0xF000. x86 stores numbers low byte first, which is why they look reversed.',
    formula: 'CS base = 0xF000 × 16 = 0xF0000      0xF0000 + 0xE05B = 0xFE05B',
    hint: 'Next chapter: the BIOS power-on self test (POST). Coming soon.',
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
]);
