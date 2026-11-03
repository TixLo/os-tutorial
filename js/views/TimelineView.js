// A timeline in the explanation panel: one lane per source (the timer interrupt, a timer,
// a task), with marks for moments and bars for stretches of time. Used from day 12 for
// timer ticks and timeouts, and from day 15 for which task runs when.
//
// timeline: { title, start, end, unit, lanes: [{ name, marks: [{ at, label }],
//   spans: [{ from, to, label, kind }] }], now, note }
// Times are numbers in `unit` (for example 'ms'); `now` draws a line at that time.

const AXIS_TICKS = 4;

export class TimelineView {
  #root;
  #drawn = '';

  constructor(root = document.getElementById('timeline-diagram')) {
    this.#root = root;
  }

  render(timeline) {
    const key = JSON.stringify(timeline || null);
    if (key === this.#drawn) return;
    this.#drawn = key;
    this.#root.replaceChildren();
    if (!timeline) return;

    const { start, end, unit } = timeline;
    const at = (time) => `${(((time - start) / (end - start)) * 100).toFixed(3)}%`;

    const title = document.createElement('p');
    title.className = 'tl-title';
    title.textContent = timeline.title;
    this.#root.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'tl-grid';
    for (const lane of timeline.lanes) {
      const name = document.createElement('span');
      name.className = 'tl-name';
      name.textContent = lane.name;
      const track = document.createElement('div');
      track.className = 'tl-track';
      for (const span of lane.spans || []) {
        const bar = document.createElement('span');
        bar.className = 'tl-span';
        if (span.kind) bar.dataset.kind = span.kind;
        bar.style.left = at(span.from);
        bar.style.width = `calc(${at(span.to)} - ${at(span.from)})`;
        bar.textContent = span.label || '';
        bar.title = span.label || '';
        track.appendChild(bar);
      }
      for (const mark of lane.marks || []) {
        const tick = document.createElement('span');
        tick.className = mark.label ? 'tl-mark tl-event' : 'tl-mark';
        tick.style.left = at(mark.at);
        if (mark.label) {
          const label = document.createElement('span');
          // Labels near the right end open to the left so they stay inside the track
          const share = (mark.at - start) / (end - start);
          label.className = share > 0.7 ? 'tl-label tl-label-left' : 'tl-label';
          label.textContent = mark.label;
          tick.appendChild(label);
        }
        track.appendChild(tick);
      }
      if (timeline.now !== undefined && timeline.now !== null) {
        const now = document.createElement('span');
        now.className = 'tl-now';
        now.style.left = at(timeline.now);
        track.appendChild(now);
      }
      grid.append(name, track);
    }

    // Time axis under the last lane
    grid.appendChild(document.createElement('span'));
    const axis = document.createElement('div');
    axis.className = 'tl-axis';
    for (let i = 0; i <= AXIS_TICKS; i++) {
      const time = start + ((end - start) * i) / AXIS_TICKS;
      const label = document.createElement('span');
      label.style.left = at(time);
      label.textContent = `${Number.isInteger(time) ? time : time.toFixed(1)} ${unit}`;
      axis.appendChild(label);
    }
    grid.appendChild(axis);
    this.#root.appendChild(grid);

    if (timeline.note) {
      const note = document.createElement('p');
      note.className = 'tl-note';
      note.textContent = timeline.note;
      this.#root.appendChild(note);
    }
  }
}
