const STEP_MS = 5000;  // time per step at 1× speed
const SPEEDS = [0.5, 1, 2];
const FIRST_STEP = 1;  // the step right after the power button is pressed

// Drives the boot sequence: the power button turns the machine on or off, the player
// moves through the steps once it is on, every step change is pushed to memory and
// all the views that show machine state, and auto play advances one step at a time.
export class MachineController {
  #playing = false;
  #speedIndex = 1;
  #timer = null;
  #deadline = 0;           // when auto play moves on, while playing
  #remaining = STEP_MS;    // ms left on the current step, while paused

  constructor(machine, memory, views) {
    this.machine = machine;
    this.memory = memory;
    this.views = views;
    const { frontPanel, player } = views;

    frontPanel.on('power', () => {
      this.#pause();
      machine.pressPower();
    });

    player.on('play', () => (this.#playing ? this.#pause() : this.#play()));
    player.on('prev', () => {
      if (machine.index > FIRST_STEP) machine.back();
    });
    player.on('next', () => {
      if (machine.powered) machine.next();
    });
    player.on('seek', (index) => {
      if (machine.powered) machine.goto(Math.max(FIRST_STEP, index));
    });
    player.on('speed', () => this.#cycleSpeed());
    player.on('restart', () => {
      if (machine.powered) machine.goto(FIRST_STEP);
    });

    machine.on('step', (event) => {
      this.#remaining = this.#stepMs;
      if (this.#playing && machine.isLast) {
        clearTimeout(this.#timer);
        this.#playing = false;  // reached the end
      } else if (this.#playing) {
        this.#schedule(this.#stepMs);
      }
      this.#render(event);
    });
  }

  init() {
    const { index, step, state } = this.machine;
    this.#render({ index, step, state, previous: null });
  }

  get #stepMs() {
    return STEP_MS / SPEEDS[this.#speedIndex];
  }

  get #timeLeft() {
    return this.#playing ? Math.max(0, this.#deadline - performance.now()) : this.#remaining;
  }

  #play() {
    if (!this.machine.powered) return;
    if (this.machine.isLast) this.machine.goto(FIRST_STEP);  // replay from the start
    this.#playing = true;
    this.#schedule(this.#remaining);
    this.#renderPlayer();
  }

  #pause() {
    if (!this.#playing) return;
    this.#remaining = this.#timeLeft;
    clearTimeout(this.#timer);
    this.#playing = false;
    this.#renderPlayer();
  }

  #schedule(ms) {
    clearTimeout(this.#timer);
    this.#deadline = performance.now() + ms;
    this.#timer = setTimeout(() => this.machine.next(), ms);
  }

  // Keep the same fraction of the step left when the speed changes
  #cycleSpeed() {
    const fractionLeft = this.#timeLeft / this.#stepMs;
    this.#speedIndex = (this.#speedIndex + 1) % SPEEDS.length;
    this.#remaining = fractionLeft * this.#stepMs;
    if (this.#playing) this.#schedule(this.#remaining);
    this.#renderPlayer();
  }

  #render({ index, step, state, previous }) {
    const { frontPanel, lesson, board, registers, display, status } = this.views;
    frontPanel.render({ powered: this.machine.powered, led: state.led });
    this.memory.apply(state.memory);
    lesson.render(step);
    board.render(state);
    registers.render(state.regs, previous && previous.regs, state.cpu);
    display.render(state.monitor);
    status.render({ time: step.time, cpu: state.cpu, csip: state.csip });
    this.#renderPlayer();
  }

  #renderPlayer() {
    const duration = this.#stepMs;
    this.views.player.render({
      enabled: this.machine.powered,
      index: this.machine.index,
      playing: this.#playing,
      duration,
      elapsed: duration - this.#timeLeft,
      speed: SPEEDS[this.#speedIndex],
      canPrev: this.machine.index > FIRST_STEP,
      canNext: !this.machine.isLast,
    });
  }
}
