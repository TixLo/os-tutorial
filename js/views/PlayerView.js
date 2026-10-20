import { EventEmitter } from '../core/EventEmitter.js';

// Video-player style controls for the boot sequence.
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

  constructor(steps, phases, root = document.getElementById('player')) {
    super();
    this.#root = root;
    this.#steps = steps;
    this.#track = root.querySelector('.pl-track');
    this.#count = root.querySelector('.pl-count');
    this.#title = root.querySelector('.pl-title');
    this.#track.setAttribute('aria-valuemax', String(steps.length));

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
  render({ index, playing, duration, elapsed, speed, canPrev, canNext }) {
    const step = this.#steps[index];
    this.#root.dataset.playing = String(playing);
    this.#buttons.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    this.#buttons.prev.disabled = !canPrev;
    this.#buttons.restart.disabled = !canPrev;
    this.#buttons.next.disabled = !canNext;
    this.#buttons.speed.textContent = speed + '×';
    this.#count.textContent = `${index + 1} / ${this.#steps.length}`;
    this.#title.textContent = `${step.id} ${step.title}`;
    this.#track.setAttribute('aria-valuenow', String(index + 1));
    this.#track.setAttribute('aria-valuetext', `${step.id} ${step.title}`);

    this.#segments.forEach((segment, i) => {
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
      if (e.metaKey || e.ctrlKey || e.altKey) return;
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
