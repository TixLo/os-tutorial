// Wires LayoutView input to LayoutModel and pushes model changes back to the view.
export class LayoutController {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    model.on('change', (name, percent) => view.render(name, percent));

    view.on('resize', (name, percent) => model.set(name, percent));
    view.on('resizeEnd', () => model.save());
    view.on('nudge', (name, delta) => {
      model.nudge(name, delta);
      model.save();
    });
    view.on('reset', (name) => {
      model.reset(name);
      model.save();
    });
  }

  init() {
    this.model.load();
    for (const name of this.model.names) {
      this.view.render(name, this.model.get(name));
    }
  }
}
