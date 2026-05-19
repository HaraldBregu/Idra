import { BrowserWindow } from 'electron';
import type { BrowserWindowConstructorOptions } from 'electron';
import type { AppState } from './core/app-state';
import type { WindowFactory } from './core/window-factory';
import type { WindowContextManager } from './core/window-context';
import type { MainServices } from './service-registry';

const DEFAULT_WINDOW_WIDTH = 440;
const DEFAULT_WINDOW_HEIGHT = 600;
const STARTUP_WINDOW_WIDTH = 440;
const STARTUP_WINDOW_HEIGHT = 600;
const TRAY_CHILD_WINDOW_WIDTH = 600;
const TRAY_CHILD_WINDOW_HEIGHT = 240;

const TRANSPARENT_WINDOW_BACKGROUND = '#00000000';
const TRAY_CHILD_WINDOW_BACKGROUND = '#000000';
const TRAY_CHILD_WINDOW_HTML = encodeURIComponent(
	`<!doctype html>
<html>
	<head>
		<meta charset="UTF-8">
		<style>
			* {
				box-sizing: border-box;
			}

			html,
			body {
				width: 100%;
				height: 100%;
				margin: 0;
				background: #000;
				overflow: hidden;
				font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			}

			main {
				width: 100%;
				height: 100%;
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 12px;
				padding: 24px;
			}

			button {
				width: 132px;
				height: 42px;
				border: 1px solid #3f3f46;
				border-radius: 8px;
				background: #18181b;
				color: #fafafa;
				font: inherit;
				font-size: 14px;
				font-weight: 500;
				letter-spacing: 0;
				cursor: default;
			}

			button:hover {
				background: #27272a;
				border-color: #71717a;
			}

			button:focus-visible {
				outline: 2px solid #fafafa;
				outline-offset: 3px;
			}
		</style>
	</head>
	<body>
		<main aria-label="Friday tray actions">
			<button type="button">Ask Friday</button>
			<button type="button">New Task</button>
			<button type="button">Open App</button>
		</main>
	</body>
</html>`
);

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
	private trayChildWindow: BrowserWindow | null = null;
	private readonly appWindows = new Set<BrowserWindow>();
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
			onReadyToShow?: (win: BrowserWindow) => void;
		} = {}
	): BrowserWindow {
		const { closeToTray = false, onReadyToShow } = options;
		const win = this.windowFactory.create(this.createStartupWindowOptions());
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

	showTrayChildWindow(): void {
		const win = this.getTrayChildWindow();
		win.show();
		win.focus();
	}

	private getTrayChildWindow(): BrowserWindow {
		if (this.trayChildWindow && !this.trayChildWindow.isDestroyed()) {
			return this.trayChildWindow;
		}

		const parent = this.getPreferredWindow();
		const visibleParent = parent && parent.isVisible() ? parent : undefined;
		const options: BrowserWindowConstructorOptions = {
			width: TRAY_CHILD_WINDOW_WIDTH,
			height: TRAY_CHILD_WINDOW_HEIGHT,
			minWidth: TRAY_CHILD_WINDOW_WIDTH,
			minHeight: TRAY_CHILD_WINDOW_HEIGHT,
			maxWidth: TRAY_CHILD_WINDOW_WIDTH,
			maxHeight: TRAY_CHILD_WINDOW_HEIGHT,
			show: false,
			resizable: false,
			maximizable: false,
			fullscreenable: false,
			autoHideMenuBar: true,
			title: 'Friday',
			backgroundColor: TRAY_CHILD_WINDOW_BACKGROUND,
			...(visibleParent ? { parent: visibleParent } : {}),
			webPreferences: {
				sandbox: true,
				nodeIntegration: false,
				contextIsolation: true,
				devTools: false,
				webSecurity: true,
				allowRunningInsecureContent: false,
				spellcheck: false,
			},
		};
		const win = new BrowserWindow(options);
		win.setBackgroundColor(TRAY_CHILD_WINDOW_BACKGROUND);
		void win.loadURL(`data:text/html;charset=utf-8,${TRAY_CHILD_WINDOW_HTML}`);
		win.on('closed', () => {
			if (this.trayChildWindow?.id === win.id) {
				this.trayChildWindow = null;
			}
		});
		this.trayChildWindow = win;
		return win;
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
