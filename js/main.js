// Entry point: build each model/view/controller trio and start it.
import { LayoutModel } from './models/LayoutModel.js';
import { LayoutView } from './views/LayoutView.js';
import { LayoutController } from './controllers/LayoutController.js';

const layout = new LayoutController(new LayoutModel(), new LayoutView());
layout.init();
