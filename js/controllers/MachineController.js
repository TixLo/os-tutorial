const AUTOPLAY_MS = 6000;  // time per step, long enough to read the explanation

// Drives the boot sequence: front panel, toolbar, and step list input move the machine,
// and every step change is pushed to memory and all the views that show machine state.
export class MachineController {
  #timer = null;

  constructor(machine, memory, views) {
    this.machine = machine;
    this.memory = memory;
    this.views = views;
    const { frontPanel, toolbar, lesson } = views;

    frontPanel.on('power', () => {
      this.#stop();
      machine.pressPower();
    });
    toolbar.on('next', () => this.#next());
    toolbar.on('back', () => {
      this.#stop();
      machine.back();
    });
    toolbar.on('play', () => (this.#timer ? this.#stop() : this.#play()));
    lesson.on('goto', (index) => {
      this.#stop();
      machine.goto(index);
    });

    machine.on('step', (event) => this.#render(event));
  }

  init() {
    const { index, step, state } = this.machine;
    this.#render({ index, step, state, previous: null });
  }

  // The sequence has to start with the real power button, so point at it instead
  #next() {
    if (!this.machine.powered) {
      this.views.frontPanel.hint();
      return;
    }
    this.machine.next();
  }

  #play() {
    if (!this.machine.powered) {
      this.views.frontPanel.hint();
      return;
    }
    this.#timer = setInterval(() => {
      this.machine.next();
      if (this.machine.isLast) this.#stop();
    }, AUTOPLAY_MS);
    this.#renderToolbar();
  }

  #stop() {
    if (!this.#timer) return;
    clearInterval(this.#timer);
    this.#timer = null;
    this.#renderToolbar();
  }

  #render({ index, step, state, previous }) {
    const { frontPanel, lesson, board, registers, console, status } = this.views;
    frontPanel.render({ powered: this.machine.powered, led: state.led });
    this.memory.apply(state.memory);
    lesson.render(step, index);
    board.render(state);
    registers.render(state.regs, previous && previous.regs, state.cpu);
    console.render(state.monitor);
    status.render({ time: step.time, cpu: state.cpu, csip: state.csip });
    this.#renderToolbar();
  }

  #renderToolbar() {
    this.views.toolbar.render({
      canBack: this.machine.index > 0,
      canNext: !this.machine.isLast,
      playing: Boolean(this.#timer),
    });
  }
}
