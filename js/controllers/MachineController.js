// Connects the front panel to the machine, and machine power to memory.
export class MachineController {
  constructor(machine, memory, frontPanelView) {
    this.machine = machine;
    this.frontPanelView = frontPanelView;

    frontPanelView.on('power', () => machine.togglePower());

    machine.on('power', (on) => {
      frontPanelView.render({ powered: on });
      memory.setPowered(on);
    });
  }

  init() {
    this.frontPanelView.render({ powered: this.machine.powered });
  }
}
