import type { BrowserWindow } from 'electron';
import notesPage from './notes.html?asset';
import type { WindowFactory } from '../app/window_factory';
import { render } from './render';

export function renderNotes(windowFactory: WindowFactory): BrowserWindow {
	return render(windowFactory, notesPage, 'Notes');
}
