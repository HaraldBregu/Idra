import { BrowserWindow, nativeTheme } from 'electron';
import type { AppState } from './core/app-state';
import type { WindowFactory } from './core/window-factory';
import type { WindowContextManager } from './core/window-context';
import type { MainServices } from './service-registry';

const DEFAULT_WINDOW_WIDTH = 1200;
const DEFAULT_WINDOW_HEIGHT = 900;
const STARTUP_WINDOW_WIDTH = 800;
const STARTUP_WINDOW_HEIGHT = 600;

function getBackgroundColor(): string {
	return nativeTheme.shouldUseDarkColors ? '#1A1A1A' : '#F7F7F7';
}

export class Main {
	private window: BrowserWindow | null = null;
	private onWindowVisibilityChange?: () => void;

	constructor(
		private appState: AppState,
		private windowFactory: WindowFactory,
		private windowContextManager: WindowContextManager<MainServices>
	) {
		// Constructor is now minimal
		// All services are managed by ServiceContainer in bootstrap
		// All IPC handlers are registered in IPC modules via bootstrap
	}

	/**
	 * Attach common window event handlers shared by all window types.
	 *
	 * Handlers include:
	 *   - update-target-url: Suppresses native Chromium URL bubble on link hover
	 *   - maximize/unmaximize: Notifies renderer of window state changes
	 *   - enter/leave fullscreen: Notifies renderer of fullscreen state changes
	 */
	private attachCommonWindowHandlers(win: BrowserWindow): void {
		// Suppress native Chromium URL bubble on link hover
		win.webContents.on('update-target-url', () => {});

		// Notify renderer when window is maximized/unmaximized
		win.on('maximize', () => {
			win.webContents.send('window:maximize-change', true);
		});

		win.on('unmaximize', () => {
			win.webContents.send('window:maximize-change', false);
		});

		// Notify renderer when entering/leaving fullscreen
		win.on('enter-full-screen', () => {
			win.webContents.send('window:fullscreen-change', true);
		});

		win.on('leave-full-screen', () => {
			win.webContents.send('window:fullscreen-change', false);
		});
	}

	private createWindowOptions(trafficLightPosition = { x: 16, y: 16 }) {
		const isMac = process.platform === 'darwin';
		return {
			width: DEFAULT_WINDOW_WIDTH,
			height: DEFAULT_WINDOW_HEIGHT,
			minWidth: DEFAULT_WINDOW_WIDTH,
			minHeight: DEFAULT_WINDOW_HEIGHT,
			maxWidth: DEFAULT_WINDOW_WIDTH,
			maxHeight: DEFAULT_WINDOW_HEIGHT,
			resizable: false,
			maximizable: false,
			fullscreenable: false,
			frame: false,
			// titleBarStyle:'hidden' on Windows retains native min/max/close buttons.
			// Only use it on macOS where it hides the title bar while keeping traffic lights.
			...(isMac && {
				titleBarStyle: 'hidden' as const,
				trafficLightPosition,
			}),
			backgroundColor: getBackgroundColor(),
		};
	}

	private createStartupWindowOptions() {
		return {
			...this.createWindowOptions(),
			width: STARTUP_WINDOW_WIDTH,
			height: STARTUP_WINDOW_HEIGHT,
			minWidth: STARTUP_WINDOW_WIDTH,
			minHeight: STARTUP_WINDOW_HEIGHT,
			maxWidth: STARTUP_WINDOW_WIDTH,
			maxHeight: STARTUP_WINDOW_HEIGHT,
		};
	}

	private trackWindowVisibility(win: BrowserWindow): void {
		win.on('show', () => {
			this.onWindowVisibilityChange?.();
		});

		win.on('hide', () => {
			this.onWindowVisibilityChange?.();
		});

		win.on('closed', () => {
			if (this.window?.id === win.id) {
				this.window = null;
			}
			this.onWindowVisibilityChange?.();
		});
	}

	private createLauncherWindow(
		options: {
			closeToTray?: boolean;
			onReadyToShow?: (win: BrowserWindow) => void;
		} = {}
	): BrowserWindow {
		const { closeToTray = false, onReadyToShow } = options;
		const win = this.windowFactory.create(this.createStartupWindowOptions());

		// Create window context for isolated services
		this.windowContextManager.create(win);

		this.attachCommonWindowHandlers(win);
		this.trackWindowVisibility(win);

		win.once('ready-to-show', () => {
			win.show();
			onReadyToShow?.(win);
		});

		if (closeToTray) {
			win.on('close', (event) => {
				if (this.appState.isQuitting) {
					return;
				}

				event.preventDefault();
				win.hide();
				this.onWindowVisibilityChange?.();
			});
			this.window = win;
		}

		return win;
	}

	private getPreferredWindow(): BrowserWindow | null {
		if (this.window && !this.window.isDestroyed()) {
			return this.window;
		}

		return BrowserWindow.getAllWindows()[0] ?? null;
	}

	create(): BrowserWindow {
		return this.createLauncherWindow({ closeToTray: true });
	}

	showOrCreate(): void {
		const preferredWindow = this.getPreferredWindow();
		if (!preferredWindow) {
			this.create();
			return;
		}

		preferredWindow.show();
		preferredWindow.focus();
	}

	hide(): void {
		BrowserWindow.getAllWindows().forEach((win) => {
			win.hide();
		});
	}

	toggleVisibility(): void {
		if (!this.isVisible()) {
			this.showOrCreate();
			return;
		}

		const windows = BrowserWindow.getAllWindows();
		if (windows.length === 0) {
			this.create();
			return;
		}

		windows.forEach((win) => {
			win.hide();
		});
	}

	isVisible(): boolean {
		return BrowserWindow.getAllWindows().some((win) => win.isVisible());
	}

	setOnWindowVisibilityChange(callback: () => void): void {
		this.onWindowVisibilityChange = callback;
	}

	createAdditionalWindow(): BrowserWindow {
		return this.createLauncherWindow();
	}

	createWindowForFile(filePath: string): BrowserWindow {
		const win = this.windowFactory.create(this.createWindowOptions({ x: 9, y: 9 }));

		this.windowContextManager.create(win);
		this.attachCommonWindowHandlers(win);
		this.trackWindowVisibility(win);

		win.once('ready-to-show', () => {
			win.show();
			win.webContents.send('file-opened', filePath);
		});

		return win;
	}

	getWindow(): BrowserWindow | null {
		return this.window;
	}
}
