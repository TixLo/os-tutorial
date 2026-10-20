// Entry point: build each model/view/controller trio and start it.
import { BOOT_STEPS } from './data/bootSteps.js';
import { LayoutModel } from './models/LayoutModel.js';
import { MachineModel } from './models/MachineModel.js';
import { MemoryModel } from './models/MemoryModel.js';
import { LayoutView } from './views/LayoutView.js';
import { FrontPanelView } from './views/FrontPanelView.js';
import { PlayerView } from './views/PlayerView.js';
import { LessonView } from './views/LessonView.js';
import { BoardView } from './views/BoardView.js';
import { RegisterView } from './views/RegisterView.js';
import { DisplayView } from './views/DisplayView.js';
import { StatusView } from './views/StatusView.js';
import { MemoryView } from './views/MemoryView.js';
import { LayoutController } from './controllers/LayoutController.js';
import { MemoryController } from './controllers/MemoryController.js';
import { MachineController } from './controllers/MachineController.js';

const machine = new MachineModel(BOOT_STEPS);
const memory = new MemoryModel();
const lesson = new LessonView();
const memoryController = new MemoryController(memory, new MemoryView());

// Clicking an address in the explanation shows it in the memory panel
lesson.on('locate', (address) => memoryController.locate(address));

const controllers = [
  new LayoutController(new LayoutModel(), new LayoutView()),
  memoryController,
  new MachineController(machine, memory, {
    frontPanel: new FrontPanelView(),
    player: new PlayerView(BOOT_STEPS),
    lesson,
    board: new BoardView(),
    registers: new RegisterView(),
    display: new DisplayView(),
    status: new StatusView(),
  }),
];
controllers.forEach((controller) => controller.init());
