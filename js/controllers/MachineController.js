import { PROGRAMS } from '../data/programs/index.js';
import { sourceText } from '../data/programs/assemble.js';

const STEP_MS = 2500;  // time per step during auto play

// What each panel shows, to tell which panels a step changed
const PANEL_CONTENT = {
  display: (s) => [s.monitor, s.screen, s.cursor],
  memory: (s) => [s.memory.powered, s.writes, s.ranges, s.screen],
  dock: (s) => [s.code, s.regs && s.regs['EIP']],
};

// Address of the instruction the CPU runs next (CS base + EIP), when both are known
function nextInstruction(regs) {
  const base = regs && regs['CS base'] && regs['CS base'].value;
  const eip = regs && regs['EIP'] && regs['EIP'].value;
  const isHex = (v) => typeof v === 'string' && /^[0-9A-F]+$/i.test(v);
  return isHex(base) && isHex(eip) ? parseInt(base, 16) + parseInt(eip, 16) : null;
}

// Drives the tutorial: the chapter picker and the URL choose a chapter, the power button
// turns the machine on or off, the player moves through the chapter's steps once it is
// on, and every step change is pushed to memory and all the views that show machine
// state. Auto play advances one step at a time.
export class MachineController {
  #playing = false;
  #timer = null;
  #deadline = 0;           // when auto play moves on, while playing
  #remaining = STEP_MS;    // ms left on the current step, while paused

  constructor(machine, memory, views) {
    this.machine = machine;
    this.memory = memory;
    this.views = views;
    const { frontPanel, player, chapters, route } = views;

    frontPanel.on('power', () => {
      this.#pause();
      machine.pressPower();
    });

    chapters.on('select', (id) => machine.loadChapter(id, 0));
    route.on('navigate', (target) => {
      // A broken link or a chapter that isn't ready yet: point the URL back at where we are
      if (!target || !machine.loadChapter(target.chapterId, target.index)) {
        route.render(machine.chapter.id, machine.index);
      }
    });

    player.on('play', () => (this.#playing ? this.#pause() : this.#play()));
    player.on('prev', () => {
      if (machine.index > machine.firstStep) machine.back();
    });
    player.on('next', () => {
      if (machine.powered) machine.next();
    });
    player.on('seek', (index) => {
      if (machine.powered) machine.goto(Math.max(machine.firstStep, index));
    });
    player.on('restart', () => {
      if (machine.powered) machine.goto(machine.firstStep);
    });

    machine.on('chapter', (chapter) => {
      this.#stop();
      player.setSteps(chapter.steps, machine.firstStep);
      chapters.render(chapter.id);
    });

    machine.on('step', (event) => {
      this.#remaining = STEP_MS;
      if (this.#playing && machine.isLast) {
        this.#stop();  // reached the end
      } else if (this.#playing) {
        this.#schedule(STEP_MS);
      }
      this.#render(event);
    });
  }

  // Open the chapter and step in the URL, or the first chapter's start
  init() {
    const target = this.views.route.current();
    if (target && this.machine.loadChapter(target.chapterId, target.index)) return;
    const { chapter, index, step, state } = this.machine;
    this.views.player.setSteps(chapter.steps, this.machine.firstStep);
    this.views.chapters.render(chapter.id);
    this.#render({ index, step, state, previous: null });
  }

  get #timeLeft() {
    return this.#playing ? Math.max(0, this.#deadline - performance.now()) : this.#remaining;
  }

  #play() {
    if (!this.machine.powered) return;
    if (this.machine.isLast) this.machine.goto(this.machine.firstStep);  // replay from the start
    this.#playing = true;
    this.#schedule(this.#remaining);
    this.#renderPlayer();
  }

  #pause() {
    if (!this.#playing) return;
    this.#remaining = this.#timeLeft;
    this.#stop();
    this.#renderPlayer();
  }

  #stop() {
    clearTimeout(this.#timer);
    this.#playing = false;
  }

  #schedule(ms) {
    clearTimeout(this.#timer);
    this.#deadline = performance.now() + ms;
    this.#timer = setTimeout(() => this.machine.next(), ms);
  }

  #render({ index, step, state, previous }) {
    const { frontPanel, lesson, board, registers, display, status, route, visual, code, dock } = this.views;
    frontPanel.render({ powered: this.machine.powered, led: state.led, time: step.time });
    this.memory.apply({
      ...state.memory,
      ranges: state.ranges,
      writes: state.writes,
      screen: state.screen,
    });
    const source = step.source && PROGRAMS[step.source];
    lesson.render(step, source ? { name: source.name, text: sourceText(source) } : null);
    board.render(state);
    visual.render(state);
    registers.render(state.regs, previous && previous.regs, state.cpu);
    display.render({ monitor: state.monitor, screen: state.screen, cursor: state.cursor });
    code.render({
      program: PROGRAMS[state.code.program] || null,
      focus: state.code.focus,
      pc: state.code.program && state.code.trace !== false ? nextInstruction(state.regs) : null,
    });
    // A step picks the tab; the reader's own choice stays until a step picks another
    if (!previous || previous.tab !== state.tab) dock.select(state.tab);
    if (previous) this.#pulseChangedPanels(previous, state);
    status.render({ cpu: state.cpu, csip: state.csip });
    route.render(this.machine.chapter.id, index);
    this.#renderPlayer();
  }

  #pulseChangedPanels(previous, state) {
    for (const [panel, content] of Object.entries(PANEL_CONTENT)) {
      if (JSON.stringify(content(previous)) !== JSON.stringify(content(state))) {
        this.views.pulse.pulse(panel);
      }
    }
  }

  #renderPlayer() {
    const duration = STEP_MS;
    this.views.player.render({
      enabled: this.machine.powered,
      index: this.machine.index,
      playing: this.#playing,
      duration,
      elapsed: duration - this.#timeLeft,
      canPrev: this.machine.index > this.machine.firstStep,
      canNext: !this.machine.isLast,
    });
  }
}
