export const app = {
	getName: (): string => 'Friday',
	getPath: (): string => process.cwd(),
	getVersion: (): string => '0.0.0-test',
};

export const ipcMain = {
	handle: jest.fn(),
	on: jest.fn(),
	removeHandler: jest.fn(),
};

export const shell = {
	openExternal: jest.fn(async () => undefined),
	openPath: jest.fn(async () => ''),
};

export const clipboard = {
	writeText: jest.fn(),
};

export const systemPreferences = {
	askForMediaAccess: jest.fn(async () => true),
	getMediaAccessStatus: jest.fn(() => 'unknown'),
};

export const BrowserWindow = Object.assign(jest.fn(), {
	getAllWindows: jest.fn(() => []),
	getFocusedWindow: jest.fn(() => null),
});

export const Menu = {
	buildFromTemplate: jest.fn(() => ({})),
	setApplicationMenu: jest.fn(),
};

export const Tray = jest.fn();

export const nativeImage = {
	createFromPath: jest.fn(() => ({})),
};

export const protocol = {
	handle: jest.fn(),
};

export const session = {
	defaultSession: {},
};

export const net = {
	fetch: jest.fn(),
};

export const crashReporter = {
	start: jest.fn(),
};
