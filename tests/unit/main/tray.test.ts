jest.mock('@electron-toolkit/utils', () => ({
	is: { dev: true },
}));

jest.mock('../../../src/main/app/i18n', () => ({
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
import { Tray } from '../../../src/main/app/tray';

const originalPlatform = process.platform;

function mockPlatform(platform: NodeJS.Platform): void {
	Object.defineProperty(process, 'platform', {
		configurable: true,
		value: platform,
	});
}

function createCallbacks() {
	return {
		onToggleApp: jest.fn(),
		onQuit: jest.fn(),
		isAppVisible: jest.fn(() => false),
	};
}

function getCreatedTray() {
	const electron = jest.requireMock('electron') as { __mockTrayInstances: Array<{ listeners: Map<string, unknown[]>; emit: (event: string) => void; setContextMenu: jest.Mock; popUpContextMenu: jest.Mock }> };
	return electron.__mockTrayInstances.at(-1);
}

describe('Tray', () => {
	beforeEach(() => {
		(jest.requireMock('electron') as { __mockTrayInstances: unknown[] }).__mockTrayInstances.length = 0;
		mockPlatform(originalPlatform);
	});

	it('shows the tray menu on click', () => {
		const callbacks = createCallbacks();
		new Tray(callbacks).create();

		const tray = getCreatedTray();
		tray?.emit('click');

		const contextMenu = (Menu.buildFromTemplate as jest.Mock).mock.results.at(-1)?.value;
		expect(callbacks.onToggleApp).not.toHaveBeenCalled();
		expect(tray?.popUpContextMenu).toHaveBeenCalledWith(contextMenu);
		expect(tray?.setContextMenu).not.toHaveBeenCalled();
	});

	it('does not register a right-click handler', () => {
		const callbacks = createCallbacks();
		new Tray(callbacks).create();
		const tray = getCreatedTray();

		expect(tray?.listeners.has('right-click')).toBe(false);
	});
});
