import { BrowserWindow } from 'electron';
import { AppState } from '../../../src/main/core/app-state';
import { Main } from '../../../src/main/main';
import type { WindowFactory } from '../../../src/main/core/window-factory';
import type { WindowContextManager } from '../../../src/main/core/window-context';
import type { MainServices } from '../../../src/main/service-registry';

type Listener = (...args: unknown[]) => void;

interface MockWindow {
	id: number;
	loadURL: jest.Mock;
	on: jest.Mock;
	once: jest.Mock;
	show: jest.Mock;
	hide: jest.Mock;
	focus: jest.Mock;
	isDestroyed: jest.Mock;
	isVisible: jest.Mock;
	setBackgroundColor: jest.Mock;
	webContents: {
		on: jest.Mock;
		send: jest.Mock;
	};
	emit: (event: string, ...args: unknown[]) => void;
}

function createMockWindow(id: number): MockWindow {
	const listeners = new Map<string, Listener[]>();
	let visible = false;
	let destroyed = false;

	const addListener = (event: string, listener: Listener): void => {
		const eventListeners = listeners.get(event) ?? [];
		eventListeners.push(listener);
		listeners.set(event, eventListeners);
	};

	const win: MockWindow = {
		id,
		loadURL: jest.fn(async () => undefined),
		on: jest.fn((event: string, listener: Listener) => {
			addListener(event, listener);
			return win;
		}),
		once: jest.fn((event: string, listener: Listener) => {
			const onceListener: Listener = (...args) => {
				listeners.set(
					event,
					(listeners.get(event) ?? []).filter((entry) => entry !== onceListener)
				);
				listener(...args);
			};
			addListener(event, onceListener);
			return win;
		}),
		show: jest.fn(() => {
			visible = true;
		}),
		hide: jest.fn(() => {
			visible = false;
		}),
		focus: jest.fn(),
		isDestroyed: jest.fn(() => destroyed),
		isVisible: jest.fn(() => visible),
		setBackgroundColor: jest.fn(),
		webContents: {
			on: jest.fn(),
			send: jest.fn(),
		},
		emit: (event: string, ...args: unknown[]) => {
			if (event === 'closed') {
				destroyed = true;
				visible = false;
			}
			for (const listener of listeners.get(event) ?? []) {
				listener(...args);
			}
		},
	};

	return win;
}

function createMain(appWindows: MockWindow[]) {
	const create = jest.fn(() => {
		const win = appWindows.shift();
		if (!win) {
			throw new Error('No mock app window available');
		}
		return win;
	});
	const windowFactory = {
		create,
	} as unknown as WindowFactory;
	const windowContextManager = {
		create: jest.fn(),
	} as unknown as WindowContextManager<MainServices>;

	return {
		main: new Main(new AppState(), windowFactory, windowContextManager),
		create,
	};
}

describe('Main windows', () => {
	beforeEach(() => {
		(BrowserWindow as unknown as jest.Mock).mockReset();
	});

	it('opens a 600x240 black tray child window without showing the main window', () => {
		const appWindow = createMockWindow(1);
		const trayWindow = createMockWindow(2);
		const { main, create } = createMain([appWindow, trayWindow]);
		main.create();
		appWindow.emit('ready-to-show');
		appWindow.hide();
		appWindow.show.mockClear();

		main.showTrayChildWindow();

		expect(create).toHaveBeenLastCalledWith(expect.objectContaining({
			width: 600,
			height: 240,
			minWidth: 600,
			minHeight: 240,
			maxWidth: 600,
			maxHeight: 240,
			backgroundColor: '#000000',
			show: false,
			resizable: false,
			webPreferences: expect.objectContaining({
				contextIsolation: true,
				nodeIntegration: false,
				sandbox: true,
			}),
		}), { html: 'tray.html' });
		expect(appWindow.show).not.toHaveBeenCalled();
		expect(trayWindow.setBackgroundColor).toHaveBeenCalledWith('#000000');
		expect(trayWindow.show).toHaveBeenCalledTimes(1);
		expect(trayWindow.focus).toHaveBeenCalledTimes(1);
	});

	it('keeps tray child visibility out of main-window show and hide state', () => {
		const appWindow = createMockWindow(1);
		const trayWindow = createMockWindow(2);
		const { main } = createMain([appWindow, trayWindow]);
		main.create();
		appWindow.emit('ready-to-show');

		main.showTrayChildWindow();
		appWindow.hide.mockClear();
		trayWindow.hide.mockClear();

		main.hide();

		expect(appWindow.hide).toHaveBeenCalledTimes(1);
		expect(trayWindow.hide).not.toHaveBeenCalled();
		expect(main.isVisible()).toBe(false);
	});

	it('reuses the existing tray child window while it is open', () => {
		const appWindow = createMockWindow(1);
		const trayWindow = createMockWindow(2);
		const { main, create } = createMain([appWindow, trayWindow]);
		main.create();
		appWindow.emit('ready-to-show');

		main.showTrayChildWindow();
		main.showTrayChildWindow();

		expect(create).toHaveBeenCalledTimes(2);
		expect(trayWindow.show).toHaveBeenCalledTimes(2);
		expect(trayWindow.focus).toHaveBeenCalledTimes(2);
	});
});
