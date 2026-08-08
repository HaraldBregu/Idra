import type { BrowserWindow } from 'electron';
import type { WindowFactory } from '../window_factory';

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
			title,
			autoHideMenuBar: true,
			backgroundColor: '#f5f5f2',
		},
		{ file }
	);

	windows.set(extensionId, win);
	win.setMenuBarVisibility(false);
	win.once('ready-to-show', () => win.show());
	win.on('closed', () => windows.delete(extensionId));
	return win;
}
