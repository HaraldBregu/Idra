import { app, BrowserWindow } from 'electron';

if (!app.requestSingleInstanceLock()) {
	app.quit();
} else {
	app.on('second-instance', () => {
		const existingWindow = BrowserWindow.getAllWindows().find((win) => !win.isDestroyed());
		if (!existingWindow) return;
		if (existingWindow.isMinimized()) existingWindow.restore();
		if (!existingWindow.isVisible()) existingWindow.show();
		existingWindow.focus();
	});

	void import('./runtime');
}
