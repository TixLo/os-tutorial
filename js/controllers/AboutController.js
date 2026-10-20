// Opens the About dialog on request, and once by itself on a visitor's first visit.
export class AboutController {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    view.on('open', () => view.open());
    view.on('close', () => model.markSeen());
  }

  init() {
    if (!this.model.seen) this.view.open();
  }
}
