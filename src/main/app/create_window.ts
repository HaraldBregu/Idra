import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import type { AppState } from './app_state';
import type { RendererContentOptions, WindowFactory } from './window_factory';
import type { WindowContextManager } from './window_context';

const DEFAULT_WINDOW_WIDTH = 440;
const DEFAULT_WINDOW_HEIGHT = 600;
const STARTUP_WINDOW_WIDTH = 440;
const STARTUP_WINDOW_HEIGHT = 600;
const TRANSPARENT_WINDOW_BACKGROUND = '#00000000';

function getPlatformTranslucencyOptions(): Partial<BrowserWindowConstructorOptions> {
	if (process.platform === 'darwin') {
		return {
			vibrancy: 'under-window',
			visualEffectState: 'followWindow',
		};
	}

	return {};
}

export class Main {
	private window: BrowserWindow | null = null;
	private readonly appWindows = new Set<BrowserWindow>();
	private onWindowVisibilityChange?: () => void;

	constructor(
		private appState: AppState,
		private windowFactory: WindowFactory,
		private windowContextManager: WindowContextManager
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

	private createWindowOptions(trafficLightPosition = { x: 16, y: 17 }) {
		const isMac = process.platform === 'darwin';
		return {
			width: DEFAULT_WINDOW_WIDTH,
			height: DEFAULT_WINDOW_HEIGHT,
			resizable: false,
			maximizable: true,
			fullscreenable: false,
			frame: false,
			// titleBarStyle:'hidden' on Windows retains native min/max/close buttons.
			// Only use it on macOS where it hides the title bar while keeping traffic lights.
			...(isMac && {
				titleBarStyle: 'hidden' as const,
				trafficLightPosition,
			}),
			transparent: true,
			backgroundColor: TRANSPARENT_WINDOW_BACKGROUND,
			...getPlatformTranslucencyOptions(),
		};
	}

	private createStartupWindowOptions() {
		return {
			...this.createWindowOptions(),
			width: STARTUP_WINDOW_WIDTH,
			height: STARTUP_WINDOW_HEIGHT,
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
			this.appWindows.delete(win);
			if (this.window?.id === win.id) {
				this.window = null;
			}
			this.onWindowVisibilityChange?.();
		});
	}

	private createLauncherWindow(
		options: {
			closeToTray?: boolean;
			content?: RendererContentOptions;
			onReadyToShow?: (win: BrowserWindow) => void;
		} = {}
	): BrowserWindow {
		const { closeToTray = false, content, onReadyToShow } = options;
		const win = this.windowFactory.create(this.createStartupWindowOptions(), content);
		win.setBackgroundColor(TRANSPARENT_WINDOW_BACKGROUND);
		this.appWindows.add(win);

		// Create window context for isolated services
		this.windowContextManager.create(win);

		this.attachCommonWindowHandlers(win);
		this.trackWindowVisibility(win);

		win.once('ready-to-show', () => {
			win.setBackgroundColor(TRANSPARENT_WINDOW_BACKGROUND);
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

		return this.getOpenAppWindows()[0] ?? null;
	}

	private getOpenAppWindows(): BrowserWindow[] {
		const windows: BrowserWindow[] = [];
		for (const win of this.appWindows) {
			if (win.isDestroyed()) {
				this.appWindows.delete(win);
				continue;
			}
			windows.push(win);
		}
		return windows;
	}

	create(): BrowserWindow {
		return this.createLauncherWindow({ closeToTray: true, content: { hash: 'start' } });
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
		this.getOpenAppWindows().forEach((win) => {
			win.hide();
		});
	}

	toggleVisibility(): void {
		if (!this.isVisible()) {
			this.showOrCreate();
			return;
		}

		const windows = this.getOpenAppWindows();
		if (windows.length === 0) {
			this.create();
			return;
		}

		windows.forEach((win) => {
			win.hide();
		});
	}

	isVisible(): boolean {
		return this.getOpenAppWindows().some((win) => win.isVisible());
	}

	setOnWindowVisibilityChange(callback: () => void): void {
		this.onWindowVisibilityChange = callback;
	}

	createAdditionalWindow(): BrowserWindow {
		return this.createLauncherWindow();
	}

	createWindowForFile(filePath: string): BrowserWindow {
		const win = this.windowFactory.create(this.createWindowOptions({ x: 9, y: 9 }));
		win.setBackgroundColor(TRANSPARENT_WINDOW_BACKGROUND);
		this.appWindows.add(win);

		this.windowContextManager.create(win);
		this.attachCommonWindowHandlers(win);
		this.trackWindowVisibility(win);

		win.once('ready-to-show', () => {
			win.setBackgroundColor(TRANSPARENT_WINDOW_BACKGROUND);
			win.show();
			win.webContents.send('file-opened', filePath);
		});

		return win;
	}

	getWindow(): BrowserWindow | null {
		return this.window;
	}
}
