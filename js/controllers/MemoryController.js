// Pushes memory changes to the memory map view.
export class MemoryController {
  constructor(memory, view) {
    this.memory = memory;
    this.view = view;

    memory.on('change', (snapshot) => view.render(snapshot));
  }

  // Show one byte, e.g. when an address in the explanation is clicked
  locate(address) {
    this.view.locate(address);
  }

  init() {
    this.view.render(this.memory.snapshot);
  }
}
