import { EventEmitter } from '../core/EventEmitter.js';

// Chapter picker on the front panel. Chapters without steps yet are listed but disabled.
// Events: 'select' (chapter id)
export class ChapterView extends EventEmitter {
  #select;

  constructor(chapters, select = document.getElementById('chapter-select')) {
    super();
    this.#select = select;
    for (const chapter of chapters) {
      const option = document.createElement('option');
      option.value = chapter.id;
      option.textContent = chapter.steps
        ? `${chapter.title}: ${chapter.name}`
        : `${chapter.title} (coming soon)`;
      option.disabled = !chapter.steps;
      select.appendChild(option);
    }
    select.addEventListener('change', () => this.emit('select', select.value));
  }

  render(chapterId) {
    this.#select.value = chapterId;
  }
}
