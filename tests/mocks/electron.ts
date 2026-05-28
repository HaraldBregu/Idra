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

const powerSaveBlocker = {
	start: jest.fn(() => 1),
	stop: jest.fn(() => true),
	isStarted: jest.fn(() => true),
};

const systemPreferences = {
	askForMediaAccess: jest.fn(async () => true),
	getMediaAccessStatus: jest.fn(() => 'not-determined'),
};

const session = {
	defaultSession: {
		setPermissionCheckHandler: jest.fn(),
		setPermissionRequestHandler: jest.fn(),
	},
};

const screen = {
	getDisplayNearestPoint: jest.fn(() => ({
		workArea: { x: 0, y: 24, width: 1440, height: 876 },
		bounds: { x: 0, y: 0, width: 1440, height: 900 },
	})),
	getCursorScreenPoint: jest.fn(() => ({ x: 0, y: 0 })),
};

const ipcMain = {
	handle: jest.fn(),
	on: jest.fn(),
	off: jest.fn(),
	removeHandler: jest.fn(),
};

const ipcRenderer = {
	invoke: jest.fn(),
	send: jest.fn(),
	on: jest.fn(),
	removeListener: jest.fn(),
};

const contextBridge = {
	exposeInMainWorld: jest.fn(),
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
		once: jest.fn(),
		on: jest.fn(),
	},
}));

BrowserWindow.getAllWindows = jest.fn(() => []);
BrowserWindow.fromId = jest.fn(() => undefined);
BrowserWindow.fromWebContents = jest.fn(() => undefined);

module.exports = {
	app,
	BrowserWindow,
	contextBridge,
	ipcMain,
	ipcRenderer,
	nativeTheme,
	powerSaveBlocker,
	screen,
	session,
	shell,
	systemPreferences,
};
