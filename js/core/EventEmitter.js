// Minimal pub/sub used by models and views to talk to controllers.
export class EventEmitter {
  #handlers = new Map();

  on(event, handler) {
    if (!this.#handlers.has(event)) this.#handlers.set(event, new Set());
    this.#handlers.get(event).add(handler);
    return () => this.#handlers.get(event).delete(handler);
  }

  emit(event, ...args) {
    const handlers = this.#handlers.get(event);
    if (!handlers) return;
    for (const handler of handlers) handler(...args);
  }
}
