import { EventEmitter } from '../core/EventEmitter.js';

// Video-player style controls for the boot sequence, on the front panel next to power.
// The track covers the steps after standby, and every control stays disabled until
// the machine is powered on.
// Events: 'restart', 'prev', 'play' (toggle), 'next', 'speed' (cycle), 'seek' (step index)
// Keyboard: Space plays/pauses, Left/Right step back/forward.
export class PlayerView extends EventEmitter {
  #root;
  #buttons = {};
  #track;
  #segments = [];
  #count;
  #title;
  #steps;
  #enabled = false;

  constructor(steps, phases, root = document.getElementById('player')) {
    super();
    this.#root = root;
    this.#steps = steps;
    this.#track = root.querySelector('.pl-track');
    this.#count = root.querySelector('.pl-count');
    this.#title = root.querySelector('.pl-title');
    this.#track.setAttribute('aria-valuemax', String(steps.length - 1));

    for (const action of ['restart', 'prev', 'play', 'next', 'speed']) {
      const button = root.querySelector(`[data-action="${action}"]`);
      button.addEventListener('click', () => this.emit(action));
      this.#buttons[action] = button;
    }

    this.#buildTrack(steps, phases);
    this.#bindScrubbing();
    this.#bindKeyboard();
  }

  // duration: ms per step at the current speed; elapsed: ms already spent on this step
  render({ enabled, index, playing, duration, elapsed, speed, canPrev, canNext }) {
    const step = this.#steps[index];
    const total = this.#steps.length - 1;
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
    this.#count.textContent = `${index} / ${total}`;
    this.#title.textContent = enabled ? `${step.id} ${step.title}` : 'Press power to start';
    this.#track.setAttribute('aria-disabled', String(!enabled));
    this.#track.setAttribute('aria-valuenow', String(index));
    this.#track.setAttribute('aria-valuetext', `${step.id} ${step.title}`);

    this.#segments.forEach((segment) => {
      const i = Number(segment.dataset.index);
      const fill = segment.firstElementChild;
      segment.classList.toggle('done', i < index || (i === index && !canNext));
      segment.classList.toggle('current', i === index);
      fill.style.animation = '';
      if (i !== index || !canNext) return;
      // Fill the current segment over the time left until the next step
      void fill.offsetWidth;
      fill.style.animation = `pl-fill ${duration}ms linear ${-elapsed}ms forwards`;
      fill.style.animationPlayState = playing ? 'running' : 'paused';
    });
  }

  #buildTrack(steps, phases) {
    let group = null;
    steps.forEach((step, i) => {
      if (i === 0) return;  // standby is before the power button, not part of playback
      if (!group || group.dataset.phase !== step.phase) {
        group = document.createElement('div');
        group.className = 'pl-phase';
        group.dataset.phase = step.phase;
        group.dataset.label = `${step.phase} · ${phases[step.phase]}`;
        this.#track.appendChild(group);
      }
      const segment = document.createElement('div');
      segment.className = 'pl-seg';
      segment.dataset.index = i;
      segment.title = `${step.id} ${step.title}`;
      segment.appendChild(document.createElement('span')).className = 'pl-fill';
      group.appendChild(segment);
      group.style.flexGrow = group.children.length;  // width follows the step count
      this.#segments.push(segment);
    });
  }

  // Click or drag along the track to jump between steps
  #bindScrubbing() {
    const track = this.#track;
    let last = null;
    const seekAt = (e) => {
      if (!this.#enabled) return;
      const rect = track.getBoundingClientRect();
      const segmentRect = this.#segments[0].getBoundingClientRect();
      const y = segmentRect.top + segmentRect.height / 2;
      const x = Math.min(rect.right - 1, Math.max(rect.left + 1, e.clientX));
      const segment = document.elementFromPoint(x, y)?.closest('.pl-seg');
      if (!segment) return;
      const index = Number(segment.dataset.index);
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
      if (e.target.closest('input, textarea, select, .gutter')) return;
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
