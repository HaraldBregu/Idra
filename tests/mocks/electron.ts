/**
 * Minimal Electron mock for Jest (main-process tests).
 * Only exposes the surface used by modules under test.
 */
const app = {
	getPath: jest.fn((name: string) => `/tmp/friday-test/${name}`),
	getVersion: jest.fn(() => '1.0.0'),
};

const ipcMain = {
	handle: jest.fn(),
	on: jest.fn(),
	off: jest.fn(),
	removeHandler: jest.fn(),
};

const BrowserWindow = jest.fn().mockImplementation(() => ({
	loadURL: jest.fn(),
	on: jest.fn(),
	webContents: { send: jest.fn() },
}));

module.exports = { app, ipcMain, BrowserWindow };
