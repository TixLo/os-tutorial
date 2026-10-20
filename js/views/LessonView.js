import { EventEmitter } from '../core/EventEmitter.js';

// Step list plus the explanation for the current step.
// Events: 'goto' (step index)
export class LessonView extends EventEmitter {
  #strip;
  #chips = [];
  #fields;

  constructor(steps, phases, root = document.getElementById('lesson')) {
    super();
    this.#strip = root.querySelector('.step-strip');
    this.#fields = {
      id: root.querySelector('.step-id'),
      title: root.querySelector('.step-title'),
      time: root.querySelector('.step-time'),
      summary: root.querySelector('.step-summary'),
      detail: root.querySelector('.step-detail'),
      formula: root.querySelector('.step-formula'),
      hint: root.querySelector('.step-hint'),
    };
    this.#buildStrip(steps, phases);
  }

  render(step, index) {
    this.#chips.forEach((chip, i) => {
      chip.classList.toggle('done', i < index);
      if (i === index) chip.setAttribute('aria-current', 'step');
      else chip.removeAttribute('aria-current');
    });

    const f = this.#fields;
    f.id.textContent = step.id;
    f.title.textContent = step.title;
    f.time.textContent = step.time;
    f.summary.textContent = step.summary;
    f.detail.textContent = step.detail;
    f.formula.textContent = step.formula || '';
    f.formula.hidden = !step.formula;
    f.hint.textContent = step.hint || '';
    f.hint.hidden = !step.hint;
  }

  #buildStrip(steps, phases) {
    let phase = null;
    steps.forEach((step, i) => {
      if (step.phase !== phase) {
        phase = step.phase;
        const label = document.createElement('li');
        label.className = 'phase-label';
        label.textContent = `${phase} · ${phases[phase]}`;
        this.#strip.appendChild(label);
      }
      const item = document.createElement('li');
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'step-chip';
      chip.textContent = step.id;
      chip.title = step.title;
      chip.addEventListener('click', () => this.emit('goto', i));
      item.appendChild(chip);
      this.#strip.appendChild(item);
      this.#chips.push(chip);
    });
  }
}
