import type { BrowserWindow } from 'electron';
import { setupPdfContextMenu } from '../pdf';
import type { WindowFactory } from '../window_factory';
import { attachWindowHandlers } from '../window_events';

const windows = new Map<string, BrowserWindow>();
const titleBarHeight = 48;

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

	const isMac = process.platform === 'darwin';
	const win = windowFactory.create(
		{
			width: 820,
			height: 640,
			minWidth: 620,
			minHeight: 480,
			resizable: true,
			frame: false,
			...(isMac && {
				titleBarStyle: 'hidden',
				trafficLightPosition: { x: 16, y: 17 },
			}),
			title,
			autoHideMenuBar: true,
			backgroundColor: '#f5f5f2',
		},
		{ html: 'extension.html', hash: `extension/${encodeURIComponent(title)}` }
	);
	const view = windowFactory.createView(file);
	const resizeView = (): void => {
		const { width, height } = win.getContentBounds();
		view.setBounds({ x: 0, y: titleBarHeight, width, height: Math.max(0, height - titleBarHeight) });
	};

	win.contentView.addChildView(view);
	resizeView();
	setupPdfContextMenu(win, view.webContents);
	attachWindowHandlers(win, [win.webContents, view.webContents]);

	windows.set(extensionId, win);
	win.setMenuBarVisibility(false);
	win.once('ready-to-show', () => win.show());
	win.on('resize', resizeView);
	win.on('closed', () => {
		windows.delete(extensionId);
		if (!view.webContents.isDestroyed()) view.webContents.close();
	});
	return win;
}
