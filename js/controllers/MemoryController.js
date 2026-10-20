// Pushes memory changes to the memory map view.
export class MemoryController {
  constructor(memory, view) {
    this.memory = memory;
    this.view = view;

    memory.on('change', (snapshot) => view.render(snapshot));
  }

  init() {
    this.view.render(this.memory.snapshot);
  }
}
