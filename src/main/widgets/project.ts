import type { BrowserWindow } from 'electron';
import projectPage from './project.html?asset';
import type { WindowFactory } from '../app/window_factory';
import { render } from './render';

export function renderProject(windowFactory: WindowFactory): BrowserWindow {
	return render(windowFactory, projectPage, 'Project');
}
