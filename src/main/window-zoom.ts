import type { BrowserWindow, WebContents } from 'electron';

const lockedWebContents = new WeakSet<WebContents>();

export function resetWindowZoom(win: BrowserWindow): void {
	if (win.isDestroyed()) return;
	win.webContents.setZoomLevel(0);
	win.webContents.setZoomFactor(1);
}

export function lockWindowZoom(win: BrowserWindow): void {
	resetWindowZoom(win);
	void Promise.resolve(win.webContents.setVisualZoomLevelLimits(1, 1)).catch(() => undefined);

	if (lockedWebContents.has(win.webContents)) return;
	lockedWebContents.add(win.webContents);

	win.webContents.once('did-finish-load', () => resetWindowZoom(win));
	win.webContents.on('zoom-changed', (event) => {
		event.preventDefault();
		resetWindowZoom(win);
	});
}
