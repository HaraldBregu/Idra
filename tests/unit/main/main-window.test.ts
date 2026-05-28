import { BrowserWindow, screen } from 'electron';
import { AppState } from '../../../src/main/core/app-state';
import { Main } from '../../../src/main/shell/main';
import type { WindowFactory } from '../../../src/main/core/window-factory';
import type { WindowContextManager } from '../../../src/main/core/window-context';
import type { MainServices } from '../../../src/main/app/service-registry';

type Listener = (...args: unknown[]) => void;

const originalPlatform = process.platform;

function mockPlatform(platform: NodeJS.Platform): void {
	Object.defineProperty(process, 'platform', {
		configurable: true,
		value: platform,
	});
}

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
	setAlwaysOnTop: jest.Mock;
	setVisibleOnAllWorkspaces: jest.Mock;
	setPosition: jest.Mock;
	webContents: {
		on: jest.Mock;
		send: jest.Mock;
	};
	emit: (event: string, ...args: unknown[]) => void;
	emitWebContents: (event: string, ...args: unknown[]) => void;
}

function createMockWindow(id: number): MockWindow {
	const listeners = new Map<string, Listener[]>();
	const webContentsListeners = new Map<string, Listener[]>();
	let visible = false;
	let destroyed = false;

	const addListener = (
		targetListeners: Map<string, Listener[]>,
		event: string,
		listener: Listener
	): void => {
		const eventListeners = targetListeners.get(event) ?? [];
		eventListeners.push(listener);
		targetListeners.set(event, eventListeners);
	};

	const emitEvent = (
		targetListeners: Map<string, Listener[]>,
		event: string,
		...args: unknown[]
	): void => {
		for (const listener of targetListeners.get(event) ?? []) {
			listener(...args);
		}
	};

	const win: MockWindow = {
		id,
		loadURL: jest.fn(async () => undefined),
		on: jest.fn((event: string, listener: Listener) => {
			addListener(listeners, event, listener);
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
			addListener(listeners, event, onceListener);
			return win;
		}),
		show: jest.fn(() => {
			visible = true;
			emitEvent(listeners, 'show');
		}),
		hide: jest.fn(() => {
			visible = false;
			emitEvent(listeners, 'hide');
		}),
		focus: jest.fn(),
		isDestroyed: jest.fn(() => destroyed),
		isVisible: jest.fn(() => visible),
		setBackgroundColor: jest.fn(),
		setAlwaysOnTop: jest.fn(),
		setVisibleOnAllWorkspaces: jest.fn(),
		setPosition: jest.fn(),
		webContents: {
			on: jest.fn((event: string, listener: Listener) => {
				addListener(webContentsListeners, event, listener);
				return win.webContents;
			}),
			send: jest.fn(),
		},
		emit: (event: string, ...args: unknown[]) => {
			if (event === 'closed') {
				destroyed = true;
				visible = false;
			}
			emitEvent(listeners, event, ...args);
		},
		emitWebContents: (event: string, ...args: unknown[]) => {
			emitEvent(webContentsListeners, event, ...args);
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
		mockPlatform(originalPlatform);
		(screen.getDisplayNearestPoint as jest.Mock).mockReturnValue({
			workArea: { x: 0, y: 24, width: 1440, height: 876 },
			bounds: { x: 0, y: 0, width: 1440, height: 900 },
		});
	});

	it('opens a standalone 300x100 translucent tray window without showing the main window', () => {
		const appWindow = createMockWindow(1);
		const trayWindow = createMockWindow(2);
		const { main, create } = createMain([appWindow, trayWindow]);
		main.create();
		appWindow.emit('ready-to-show');
		appWindow.hide();
		appWindow.show.mockClear();

		main.showTrayWindow();

		const trayOptions = create.mock.calls.at(-1)?.[0] as Record<string, unknown>;
		expect(create).toHaveBeenLastCalledWith(expect.objectContaining({
			width: 300,
			height: 100,
			minWidth: 300,
			minHeight: 100,
			maxWidth: 300,
			maxHeight: 100,
			backgroundColor: 'rgba(10, 12, 18, 0.78)',
			show: false,
			transparent: true,
			frame: false,
			resizable: false,
			alwaysOnTop: true,
			skipTaskbar: true,
			webPreferences: expect.objectContaining({
				contextIsolation: true,
				nodeIntegration: false,
				sandbox: true,
			}),
		}), { html: 'tray.html' });
		expect(trayOptions.parent).toBeUndefined();
		expect(appWindow.show).not.toHaveBeenCalled();
		expect(trayWindow.setBackgroundColor).toHaveBeenCalledWith('rgba(10, 12, 18, 0.78)');
		expect(trayWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'floating');
		expect(trayWindow.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(
			true,
			{ visibleOnFullScreen: true }
		);
		expect(
			trayWindow.setVisibleOnAllWorkspaces.mock.invocationCallOrder[0]
		).toBeLessThan(trayWindow.show.mock.invocationCallOrder[0]);
		expect(trayWindow.show).toHaveBeenCalledTimes(1);
		expect(trayWindow.focus).toHaveBeenCalledTimes(1);
	});

	it('hides the tray window when focus moves outside it', () => {
		const appWindow = createMockWindow(1);
		const trayWindow = createMockWindow(2);
		const { main } = createMain([appWindow, trayWindow]);
		main.create();
		appWindow.emit('ready-to-show');

		main.showTrayWindow();
		trayWindow.hide.mockClear();
		trayWindow.setVisibleOnAllWorkspaces.mockClear();
		trayWindow.emit('blur');

		expect(trayWindow.hide).toHaveBeenCalledTimes(1);
		expect(trayWindow.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(false);
	});

	it('hides the tray window when Escape is pressed', () => {
		const appWindow = createMockWindow(1);
		const trayWindow = createMockWindow(2);
		const { main } = createMain([appWindow, trayWindow]);
		main.create();
		appWindow.emit('ready-to-show');

		main.showTrayWindow();
		trayWindow.hide.mockClear();
		trayWindow.setVisibleOnAllWorkspaces.mockClear();
		const event = { preventDefault: jest.fn() };
		trayWindow.emitWebContents('before-input-event', event, {
			type: 'keyDown',
			key: 'Escape',
		});

		expect(event.preventDefault).toHaveBeenCalledTimes(1);
		expect(trayWindow.hide).toHaveBeenCalledTimes(1);
		expect(trayWindow.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(false);
	});

	it('keeps tray window visibility out of main-window show and hide state', () => {
		const appWindow = createMockWindow(1);
		const trayWindow = createMockWindow(2);
		const { main } = createMain([appWindow, trayWindow]);
		main.create();
		appWindow.emit('ready-to-show');

		main.showTrayWindow();
		appWindow.hide.mockClear();
		trayWindow.hide.mockClear();

		main.hide();

		expect(appWindow.hide).toHaveBeenCalledTimes(1);
		expect(trayWindow.hide).not.toHaveBeenCalled();
		expect(main.isVisible()).toBe(false);
	});

	it('reuses the existing tray window while it is open', () => {
		const appWindow = createMockWindow(1);
		const trayWindow = createMockWindow(2);
		const { main, create } = createMain([appWindow, trayWindow]);
		main.create();
		appWindow.emit('ready-to-show');

		main.showTrayWindow();
		main.showTrayWindow();

		expect(create).toHaveBeenCalledTimes(2);
		expect(trayWindow.show).toHaveBeenCalledTimes(2);
		expect(trayWindow.focus).toHaveBeenCalledTimes(2);
	});

	it('positions the tray window under the macOS tray icon', () => {
		mockPlatform('darwin');
		const appWindow = createMockWindow(1);
		const trayWindow = createMockWindow(2);
		const { main } = createMain([appWindow, trayWindow]);
		main.create();
		appWindow.emit('ready-to-show');

		main.showTrayWindow({ x: 700, y: 0, width: 20, height: 22 });

		expect(screen.getDisplayNearestPoint).toHaveBeenCalledWith({ x: 710, y: 22 });
		expect(trayWindow.setPosition).toHaveBeenCalledWith(560, 24, false);
		expect(
			trayWindow.setPosition.mock.invocationCallOrder[0]
		).toBeLessThan(trayWindow.show.mock.invocationCallOrder[0]);
	});

});
