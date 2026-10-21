import { EventEmitter } from '../core/EventEmitter.js';

// {0x7C00} or {F000:E05B} in step text
const ADDRESS_TOKEN = /\{([^}]+)\}/g;

// Physical address of "0x7C00" or "F000:E05B" (segment × 16 + offset)
function parseAddress(text) {
  const segmented = /^([0-9A-F]{4}):([0-9A-F]{4})$/i.exec(text);
  if (segmented) return parseInt(segmented[1], 16) * 16 + parseInt(segmented[2], 16);
  return parseInt(text, 16);
}

// Explanation for the current step. Addresses in the text are links.
// Events: 'locate' (physical address)
export class LessonView extends EventEmitter {
  #fields;

  constructor(root = document.getElementById('lesson')) {
    super();
    this.#fields = {
      milestone: root.querySelector('.step-milestone'),
      title: root.querySelector('.step-title'),
      summary: root.querySelector('.step-summary'),
      detail: root.querySelector('.step-detail'),
      formula: root.querySelector('.step-formula'),
      hint: root.querySelector('.step-hint'),
      source: root.querySelector('.step-source'),
    };
  }

  // source: { name, text } of a whole program to show under the explanation, or null
  render(step, source = null) {
    const f = this.#fields;
    const { milestone } = step;
    f.milestone.textContent = milestone ? `Milestone · ${milestone.label}: ${milestone.text}` : '';
    f.milestone.hidden = !step.milestone;
    f.title.textContent = step.title;
    this.#fill(f.summary, step.summary);
    this.#fill(f.detail, step.detail);
    this.#fill(f.formula, step.formula || '');
    f.formula.hidden = !step.formula;
    f.hint.textContent = step.hint || '';
    f.hint.hidden = !step.hint;
    f.source.hidden = !source;
    f.source.querySelector('figcaption').textContent = source ? source.name : '';
    f.source.querySelector('pre').textContent = source ? source.text : '';
  }

  // Put text into an element, turning each {address} into a button
  #fill(element, text) {
    element.replaceChildren();
    let last = 0;
    for (const match of text.matchAll(ADDRESS_TOKEN)) {
      element.append(text.slice(last, match.index));
      const label = match[1];
      const address = parseAddress(label);
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'addr-link';
      link.textContent = label;
      link.title = 'Show this address in memory';
      link.addEventListener('click', () => this.emit('locate', address));
      element.append(link);
      last = match.index + match[0].length;
    }
    element.append(text.slice(last));
  }
}
