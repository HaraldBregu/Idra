/**
 * Minimal Electron mock for Jest (main-process tests).
 * Only exposes the surface used by modules under test.
 */
const app = {
	getPath: jest.fn((name: string) => `/tmp/friday-test/${name}`),
	getAppPath: jest.fn(() => '/tmp/friday-test/friday'),
	getVersion: jest.fn(() => '1.0.0'),
	getName: jest.fn(() => 'Friday'),
};

const shell = {
	openPath: jest.fn(async () => ''),
	openExternal: jest.fn(async () => undefined),
};

const nativeTheme = {
	themeSource: 'system',
};

const ipcMain = {
	handle: jest.fn(),
	on: jest.fn(),
	off: jest.fn(),
	removeHandler: jest.fn(),
};

const BrowserWindow = jest.fn().mockImplementation(() => ({
	id: 1,
	loadURL: jest.fn(),
	loadFile: jest.fn(),
	on: jest.fn(),
	isDestroyed: jest.fn(() => false),
	webContents: {
		send: jest.fn(),
		setWindowOpenHandler: jest.fn(),
		setZoomFactor: jest.fn(),
		setZoomLevel: jest.fn(),
		setVisualZoomLevelLimits: jest.fn(),
		once: jest.fn(),
		on: jest.fn(),
	},
}));

BrowserWindow.getAllWindows = jest.fn(() => []);
BrowserWindow.fromId = jest.fn(() => undefined);

module.exports = { app, ipcMain, BrowserWindow, shell, nativeTheme };
