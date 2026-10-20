// Explanation for the current step.
export class LessonView {
  #fields;

  constructor(root = document.getElementById('lesson')) {
    this.#fields = {
      title: root.querySelector('.step-title'),
      summary: root.querySelector('.step-summary'),
      detail: root.querySelector('.step-detail'),
      formula: root.querySelector('.step-formula'),
      hint: root.querySelector('.step-hint'),
    };
  }

  render(step) {
    const f = this.#fields;
    f.title.textContent = step.title;
    f.summary.textContent = step.summary;
    f.detail.textContent = step.detail;
    f.formula.textContent = step.formula || '';
    f.formula.hidden = !step.formula;
    f.hint.textContent = step.hint || '';
    f.hint.hidden = !step.hint;
  }
}
