// Pushes memory region changes to the memory map view.
export class MemoryController {
  constructor(memory, view) {
    this.memory = memory;
    this.view = view;

    memory.on('change', (regions) => view.render(regions));
  }

  init() {
    this.view.render(this.memory.regions);
  }
}
