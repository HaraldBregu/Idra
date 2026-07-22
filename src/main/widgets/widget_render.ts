import type { BrowserWindow } from 'electron';
import type { WindowFactory } from '../app/window_factory';
import { widgetPreloadPath } from './widget_preload';

const windows = new Set<BrowserWindow>();

export function render(
	windowFactory: WindowFactory,
	file: string,
	title: string,
	id: string
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
			webPreferences: {
				preload: widgetPreloadPath(),
				partition: `persist:friday-widget-${id}`,
			},
		},
		{ file }
	);

	windows.add(win);
	win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
	win.webContents.on('will-navigate', (event) => event.preventDefault());
	win.webContents.session.setPermissionCheckHandler(() => false);
	win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
		callback(false);
	});
	win.setMenuBarVisibility(false);
	win.once('ready-to-show', () => win.show());
	win.on('closed', () => windows.delete(win));
	return win;
}
