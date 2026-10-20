import { EventEmitter } from '../core/EventEmitter.js';

// "#day1/5": chapter id, then the step index
const ROUTE = /^#(day\d+)(?:\/(\d+))?$/;

function parse(hash) {
  const match = ROUTE.exec(hash);
  return match ? { chapterId: match[1], index: Number(match[2] || 0) } : null;
}

// Keeps the URL hash in step with the current chapter and step, so a link or a reload
// opens the same place. Writing replaces the history entry rather than adding one per
// step. Events: 'navigate' ({ chapterId, index }, or null if the hash is not a route)
// when the hash is changed by hand.
export class RouteView extends EventEmitter {
  #written = null;

  constructor() {
    super();
    window.addEventListener('hashchange', () => {
      if (location.hash === this.#written) return;
      this.emit('navigate', parse(location.hash));
    });
  }

  current() {
    return parse(location.hash);
  }

  render(chapterId, index) {
    const hash = `#${chapterId}/${index}`;
    if (hash === location.hash) return;
    this.#written = hash;
    history.replaceState(null, '', hash);
  }
}
