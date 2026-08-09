import type { BrowserWindow } from 'electron';
import type { WindowFactory } from '../window_factory';
import { attachWindowHandlers } from '../window_events';

const windows = new Map<string, BrowserWindow>();

export function render(
	windowFactory: WindowFactory,
	file: string,
	title: string,
	extensionId: string
): BrowserWindow {
	const existingWindow = windows.get(extensionId);
	if (existingWindow && !existingWindow.isDestroyed()) {
		if (existingWindow.isMinimized()) existingWindow.restore();
		if (!existingWindow.isVisible()) existingWindow.show();
		existingWindow.focus();
		return existingWindow;
	}

	const win = windowFactory.create(
		{
			width: 820,
			height: 640,
			minWidth: 620,
			minHeight: 480,
			resizable: true,
			frame: true,
			transparent: false,
			titleBarStyle: 'default',
			title,
			autoHideMenuBar: true,
			backgroundColor: '#0f172a',
		},
		{ file }
	);
	attachWindowHandlers(win);

	windows.set(extensionId, win);
	win.setMenuBarVisibility(false);
	win.once('ready-to-show', () => {
		if (!win.isDestroyed()) win.show();
	});
	win.webContents.on('page-title-updated', (event) => event.preventDefault());
	win.setTitle(title);
	win.on('closed', () => {
		windows.delete(extensionId);
	});
	return win;
}
