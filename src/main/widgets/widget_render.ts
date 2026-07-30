import type { BrowserWindow } from 'electron';
import type { WindowFactory } from '../app/window_factory';

const windows = new Set<BrowserWindow>();

export function render(
	windowFactory: WindowFactory,
	file: string,
	title: string,
	restricted = false
): BrowserWindow {
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
			...(restricted
				? {
						webPreferences: {
							preload: undefined,
							sandbox: true,
							nodeIntegration: false,
							contextIsolation: true,
							partition: 'friday-plugin-extensions',
						},
					}
				: { webPreferences: { preload: undefined } }),
		},
		{ file }
	);

	windows.add(win);
	win.setMenuBarVisibility(false);
	win.once('ready-to-show', () => win.show());
	win.on('closed', () => windows.delete(win));
	return win;
}
