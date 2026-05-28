jest.mock('@electron-toolkit/utils', () => ({
	is: { dev: true },
}));

jest.mock('../../../src/main/i18n', () => ({
	loadTranslations: jest.fn(() => ({
		showFriday: 'Show Friday',
		hideFriday: 'Hide Friday',
		quit: 'Quit',
	})),
}));

jest.mock('electron', () => {
	class MockTray {
		public readonly listeners = new Map<string, Array<(...args: unknown[]) => void>>();
		public readonly setToolTip = jest.fn();
		public readonly on = jest.fn((event: string, listener: (...args: unknown[]) => void) => {
			const listeners = this.listeners.get(event) ?? [];
			listeners.push(listener);
			this.listeners.set(event, listeners);
			return this;
		});
		public readonly destroy = jest.fn();
		public readonly setContextMenu = jest.fn();
		public readonly popUpContextMenu = jest.fn();
		public readonly getBounds = jest.fn(() => ({ x: 100, y: 0, width: 18, height: 22 }));

		emit(event: string, ...args: unknown[]): void {
			for (const listener of this.listeners.get(event) ?? []) {
				listener(...args);
			}
		}
	}

	const trayInstances: MockTray[] = [];
	const menu = {
		buildFromTemplate: jest.fn((template) => ({ template })),
	};
	const nativeImage = {
		createFromPath: jest.fn(() => ({
			resize: jest.fn(() => 'resized-icon'),
		})),
	};

	return {
		Tray: jest.fn(() => {
			const tray = new MockTray();
			trayInstances.push(tray);
			return tray;
		}),
		Menu: menu,
		nativeImage,
		__mockTrayInstances: trayInstances,
	};
});

import { Menu } from 'electron';
import { Tray } from '../../../src/main/tray';

const originalPlatform = process.platform;

function mockPlatform(platform: NodeJS.Platform): void {
	Object.defineProperty(process, 'platform', {
		configurable: true,
		value: platform,
	});
}

function createCallbacks() {
	return {
		onShowApp: jest.fn(),
		onHideApp: jest.fn(),
		onShowTrayWindow: jest.fn(),
		onToggleApp: jest.fn(),
		onQuit: jest.fn(),
		isAppVisible: jest.fn(() => false),
	};
}

function getCreatedTray() {
	const electron = jest.requireMock('electron') as { __mockTrayInstances: Array<{ emit: (event: string) => void; setContextMenu: jest.Mock; popUpContextMenu: jest.Mock; getBounds: jest.Mock }> };
	return electron.__mockTrayInstances.at(-1);
}

describe('Tray', () => {
	beforeEach(() => {
		(jest.requireMock('electron') as { __mockTrayInstances: unknown[] }).__mockTrayInstances.length = 0;
		mockPlatform(originalPlatform);
	});

	it('opens the tray window with icon bounds on macOS tray click', () => {
		mockPlatform('darwin');
		const callbacks = createCallbacks();
		new Tray(callbacks).create();

		const tray = getCreatedTray();
		tray?.emit('click');

		expect(callbacks.onShowTrayWindow).toHaveBeenCalledTimes(1);
		expect(callbacks.onShowTrayWindow).toHaveBeenCalledWith({
			x: 100,
			y: 0,
			width: 18,
			height: 22,
		});
		expect(callbacks.onShowApp).not.toHaveBeenCalled();
		expect(callbacks.onToggleApp).not.toHaveBeenCalled();
		expect(tray?.setContextMenu).not.toHaveBeenCalled();
		expect(tray?.popUpContextMenu).not.toHaveBeenCalled();
	});

	it('shows the tray menu on right click', () => {
		const callbacks = createCallbacks();
		new Tray(callbacks).create();
		const tray = getCreatedTray();

		tray?.emit('right-click');

		const contextMenu = (Menu.buildFromTemplate as jest.Mock).mock.results.at(-1)?.value;
		expect(callbacks.onShowApp).not.toHaveBeenCalled();
		expect(callbacks.onShowTrayWindow).not.toHaveBeenCalled();
		expect(tray?.popUpContextMenu).toHaveBeenCalledWith(contextMenu);
		expect(tray?.setContextMenu).not.toHaveBeenCalled();
	});
});
