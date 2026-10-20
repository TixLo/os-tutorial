import { EventEmitter } from '../core/EventEmitter.js';

const STEP_TRANSITION_MS = 200;  // smooth jump when stepping by hand

// Video-player style controls for the boot sequence, on the front panel next to power.
// The progress bar runs from A1 (just after the power button) to the last step, and
// every control stays disabled until the machine is powered on. Milestone steps get a
// diamond marker with a short label on the bar; hover it for the full text.
// Events: 'restart', 'prev', 'play' (toggle), 'next', 'seek' (step index)
// Keyboard: Space plays/pauses, Left/Right step back/forward.
export class PlayerView extends EventEmitter {
  #root;
  #buttons = {};
  #track;
  #fill;
  #count;
  #markers = [];  // { index, el }
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

    for (const action of ['restart', 'prev', 'play', 'next']) {
      const button = root.querySelector(`[data-action="${action}"]`);
      button.addEventListener('click', () => this.emit(action));
      this.#buttons[action] = button;
    }

    this.#buildMarkers();
    this.#bindScrubbing();
    this.#bindKeyboard();
  }

  #buildMarkers() {
    const rail = this.#fill.parentElement;
    this.#steps.forEach((step, index) => {
      if (!step.milestone || index === 0) return;
      const position = this.#position(index);
      const el = document.createElement('span');
      el.className = 'pl-milestone';
      el.style.left = `${position * 100}%`;
      el.title = `${step.milestone.label}: ${step.milestone.text}`;
      // Keep the label inside the bar near either end
      el.dataset.align = position > 0.85 ? 'end' : position < 0.15 ? 'start' : 'center';
      const label = document.createElement('span');
      label.className = 'pl-milestone-label';
      label.textContent = step.milestone.label;
      el.append(document.createElement('i'), label);
      rail.appendChild(el);
      this.#markers.push({ index, el });
    });
  }

  get #lastIndex() {
    return this.#steps.length - 1;
  }

  // Position on the bar (0..1) of the start of a step; step 1 is the left end
  #position(index) {
    return Math.min(1, Math.max(0, (index - 1) / (this.#lastIndex - 1)));
  }

  // duration: ms per step during auto play; elapsed: ms already spent on this step
  render({ enabled, index, playing, duration, elapsed, canPrev, canNext }) {
    const step = this.#steps[index];
    this.#enabled = enabled;
    this.#root.dataset.enabled = String(enabled);
    this.#root.dataset.playing = String(playing);
    this.#buttons.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    this.#buttons.play.disabled = !enabled;
    this.#buttons.prev.disabled = !enabled || !canPrev;
    this.#buttons.restart.disabled = !enabled || !canPrev;
    this.#buttons.next.disabled = !enabled || !canNext;
    this.#count.textContent = `${index} / ${this.#lastIndex}`;
    this.#track.setAttribute('aria-disabled', String(!enabled));
    this.#track.setAttribute('aria-valuenow', String(index));
    this.#track.setAttribute('aria-valuetext', step.title);
    for (const marker of this.#markers) {
      marker.el.classList.toggle('reached', enabled && index >= marker.index);
    }
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
