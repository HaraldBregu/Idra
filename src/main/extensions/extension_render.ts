import type { BrowserWindow, WebContents, WebContentsView } from 'electron';
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

	windows.set(extensionId, win);
	win.setMenuBarVisibility(false);
	let extensionView: WebContentsView | undefined;
	let extensionContents: WebContents | undefined;
	let shellReady = false;
	let extensionReady = false;
	let childClosing = false;
	let hostCloseAllowed = false;
	const showWhenReady = (): void => {
		if (shellReady && extensionReady && !win.isDestroyed()) win.show();
	};
	const resizeView = (): void => {
		if (!extensionView || win.isDestroyed()) return;
		const { width, height } = win.getContentBounds();
		extensionView.setBounds({
			x: 0,
			y: titleBarHeight,
			width,
			height: Math.max(0, height - titleBarHeight),
		});
	};

	win.once('ready-to-show', () => {
		shellReady = true;
		showWhenReady();
	});
	win.webContents.once('did-finish-load', () => {
		if (win.isDestroyed()) return;
		const { view, loaded } = windowFactory.createView(file);
		extensionView = view;
		extensionContents = view.webContents;
		const viewContents = extensionContents;

		win.contentView.addChildView(view);
		resizeView();
		setupPdfContextMenu(win, viewContents);
		attachWindowHandlers(win, [win.webContents, viewContents]);
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
		void loaded
			.catch(() => undefined)
			.finally(() => {
				extensionReady = true;
				showWhenReady();
			});
	});
	win.on('resize', resizeView);
	win.on('close', (event) => {
		if (!extensionContents || hostCloseAllowed || extensionContents.isDestroyed()) return;
		event.preventDefault();
		if (childClosing) return;
		childClosing = true;
		extensionContents.close({ waitForBeforeUnload: true });
	});
	win.on('closed', () => {
		windows.delete(extensionId);
		if (extensionContents && !extensionContents.isDestroyed()) extensionContents.close();
	});
	return win;
}
