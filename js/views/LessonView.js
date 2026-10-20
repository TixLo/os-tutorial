// Explanation for the current step.
export class LessonView {
  #fields;

  constructor(root = document.getElementById('lesson')) {
    this.#fields = {
      id: root.querySelector('.step-id'),
      title: root.querySelector('.step-title'),
      time: root.querySelector('.step-time'),
      summary: root.querySelector('.step-summary'),
      detail: root.querySelector('.step-detail'),
      formula: root.querySelector('.step-formula'),
      hint: root.querySelector('.step-hint'),
    };
  }

  render(step) {
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
}
