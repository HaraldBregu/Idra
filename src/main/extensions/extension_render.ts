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
			transparent: true,
			...(isMac && {
				titleBarStyle: 'hidden',
				trafficLightPosition: { x: 16, y: 17 },
			}),
			title,
			autoHideMenuBar: true,
			backgroundColor: '#00000000',
		},
		{ html: 'extension.html', hash: `extension/${encodeURIComponent(title)}` }
	);
	const { view, loaded } = windowFactory.createView(file);
	const viewContents = view.webContents;
	const resizeView = (): void => {
		const { width, height } = win.getContentBounds();
		view.setBounds({ x: 0, y: titleBarHeight, width, height: Math.max(0, height - titleBarHeight) });
	};

	win.contentView.addChildView(view);
	resizeView();
	setupPdfContextMenu(win, viewContents);
	attachWindowHandlers(win, [win.webContents, viewContents]);

	windows.set(extensionId, win);
	win.setMenuBarVisibility(false);
	let shellReady = false;
	let extensionReady = false;
	let childClosing = false;
	let hostCloseAllowed = false;
	const showWhenReady = (): void => {
		if (shellReady && extensionReady && !win.isDestroyed()) win.show();
	};
	win.once('ready-to-show', () => {
		shellReady = true;
		showWhenReady();
	});
	void loaded
		.catch(() => undefined)
		.finally(() => {
			extensionReady = true;
			showWhenReady();
		});
	win.on('resize', resizeView);
	viewContents.on('will-prevent-unload', () => {
		childClosing = false;
	});
	viewContents.once('destroyed', () => {
		childClosing = false;
		if (!win.isDestroyed()) {
			hostCloseAllowed = true;
			win.close();
		}
	});
	win.on('close', (event) => {
		if (hostCloseAllowed || viewContents.isDestroyed()) return;
		event.preventDefault();
		if (childClosing) return;
		childClosing = true;
		viewContents.close({ waitForBeforeUnload: true });
	});
	win.on('closed', () => {
		windows.delete(extensionId);
		if (!viewContents.isDestroyed()) viewContents.close();
	});
	return win;
}
