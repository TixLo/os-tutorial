import { EventEmitter } from '../core/EventEmitter.js';

const STEP_TRANSITION_MS = 200;  // smooth jump when stepping by hand

// Video-player style controls for the boot sequence, on the front panel next to power.
// The progress bar runs from A1 (just after the power button) to the last step, and
// every control stays disabled until the machine is powered on.
// Events: 'restart', 'prev', 'play' (toggle), 'next', 'speed' (cycle), 'seek' (step index)
// Keyboard: Space plays/pauses, Left/Right step back/forward.
export class PlayerView extends EventEmitter {
  #root;
  #buttons = {};
  #track;
  #fill;
  #count;
  #steps;
  #enabled = false;

  constructor(steps, root = document.getElementById('player')) {
    super();
    this.#root = root;
    this.#steps = steps;
    this.#track = root.querySelector('.pl-track');
    this.#fill = root.querySelector('.pl-fill');
    this.#count = root.querySelector('.pl-count');
    this.#track.setAttribute('aria-valuemax', String(this.#lastIndex));

    for (const action of ['restart', 'prev', 'play', 'next', 'speed']) {
      const button = root.querySelector(`[data-action="${action}"]`);
      button.addEventListener('click', () => this.emit(action));
      this.#buttons[action] = button;
    }

    this.#bindScrubbing();
    this.#bindKeyboard();
  }

  get #lastIndex() {
    return this.#steps.length - 1;
  }

  // Position on the bar (0..1) of the start of a step; step 1 is the left end
  #position(index) {
    return Math.min(1, Math.max(0, (index - 1) / (this.#lastIndex - 1)));
  }

  // duration: ms per step at the current speed; elapsed: ms already spent on this step
  render({ enabled, index, playing, duration, elapsed, speed, canPrev, canNext }) {
    const step = this.#steps[index];
    this.#enabled = enabled;
    this.#root.dataset.enabled = String(enabled);
    this.#root.dataset.playing = String(playing);
    this.#buttons.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    this.#buttons.play.disabled = !enabled;
    this.#buttons.prev.disabled = !enabled || !canPrev;
    this.#buttons.restart.disabled = !enabled || !canPrev;
    this.#buttons.next.disabled = !enabled || !canNext;
    this.#buttons.speed.disabled = !enabled;
    this.#buttons.speed.textContent = speed + '×';
    this.#count.textContent = `${index} / ${this.#lastIndex}`;
    this.#track.setAttribute('aria-disabled', String(!enabled));
    this.#track.setAttribute('aria-valuenow', String(index));
    this.#track.setAttribute('aria-valuetext', step.title);
    this.#renderFill(enabled, index, playing, duration, elapsed, canNext);
  }

  // While playing, the bar glides toward the next step over the time left on this one
  #renderFill(enabled, index, playing, duration, elapsed, canNext) {
    const fill = this.#fill;
    if (!enabled) {
      fill.style.transition = 'none';
      fill.style.width = '0%';
      return;
    }
    const start = this.#position(index);
    const end = canNext ? this.#position(index + 1) : start;
    const now = start + (end - start) * (elapsed / duration);

    if (!playing || !canNext) {
      fill.style.transition = `width ${STEP_TRANSITION_MS}ms ease-out`;
      fill.style.width = `${now * 100}%`;
      return;
    }
    fill.style.transition = 'none';
    fill.style.width = `${now * 100}%`;
    void fill.offsetWidth;
    fill.style.transition = `width ${duration - elapsed}ms linear`;
    fill.style.width = `${end * 100}%`;
  }

  // Click or drag along the bar to jump to the nearest step
  #bindScrubbing() {
    const track = this.#track;
    let last = null;
    const seekAt = (e) => {
      if (!this.#enabled) return;
      const rect = track.getBoundingClientRect();
      const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const index = 1 + Math.round(fraction * (this.#lastIndex - 1));
      if (index === last) return;
      last = index;
      this.emit('seek', index);
    };
    track.addEventListener('pointerdown', (e) => {
      track.setPointerCapture(e.pointerId);
      last = null;
      seekAt(e);
    });
    track.addEventListener('pointermove', (e) => {
      if (track.hasPointerCapture(e.pointerId)) seekAt(e);
    });
  }

  #bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (!this.#enabled || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest('input, textarea, select, .gutter, dialog')) return;
      if (e.key === ' ' && !e.target.closest('button')) {
        e.preventDefault();
        this.emit('play');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.emit('next');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.emit('prev');
      }
    });
  }
}
