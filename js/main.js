// Entry point: build each model/view/controller trio and start it.
import { LayoutModel } from './models/LayoutModel.js';
import { LayoutView } from './views/LayoutView.js';
import { LayoutController } from './controllers/LayoutController.js';
import { MachineModel } from './models/MachineModel.js';
import { MemoryModel } from './models/MemoryModel.js';
import { FrontPanelView } from './views/FrontPanelView.js';
import { MemoryView } from './views/MemoryView.js';
import { MachineController } from './controllers/MachineController.js';
import { MemoryController } from './controllers/MemoryController.js';

const machine = new MachineModel();
const memory = new MemoryModel();

const controllers = [
  new LayoutController(new LayoutModel(), new LayoutView()),
  new MemoryController(memory, new MemoryView()),
  new MachineController(machine, memory, new FrontPanelView()),
];
controllers.forEach((controller) => controller.init());
