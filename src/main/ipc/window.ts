import { ipcMain, BrowserWindow, Menu as ElectronMenu } from 'electron';
import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { wrapIpcHandler } from './core/error_handler';
import { WindowChannels } from '../../shared/ipc_channels_definitions';
import type { LoggerService } from '../shared';

export interface WindowIpcDeps {
	logger: LoggerService;
}

/**
 * IPC handlers for window management operations.
 *
 * Channels (send/on):
 *  - window:minimize   (send) -- Minimize the window
 *  - window:maximize   (send) -- Toggle maximize state
 *  - window:close      (send) -- Close the window
 *  - window:popup-menu (send) -- Show application menu as popup (Windows/Linux)
 *  - window:set-compact (send) -- Resize to 100x100 voice rectangle / restore previous bounds
 *
 * Channels (invoke/handle):
 *  - window:is-maximized  (query) -- Check if window is maximized
 *  - window:is-fullscreen (query) -- Check if window is in fullscreen
 * Event channels (push):
 *  - window:maximize-change  -- Window maximize state changed
 *  - window:fullscreen-change -- Window fullscreen state changed
 */
export class WindowIpc implements IpcModule<WindowIpcDeps> {
	readonly name = 'window';

	register({ logger }: WindowIpcDeps, _eventBus: EventBus): void {
		// --- Send handlers (fire-and-forget) ---

		ipcMain.on(WindowChannels.minimize, (event) => {
			const win = BrowserWindow.fromWebContents(event.sender);
			if (win) win.minimize();
		});

		ipcMain.on(WindowChannels.maximize, (event) => {
			const win = BrowserWindow.fromWebContents(event.sender);
			if (win) {
				if (!win.isMaximizable()) return;
				if (win.isMaximized()) {
					win.unmaximize();
				} else {
					win.maximize();
				}
			}
		});

		ipcMain.on(WindowChannels.close, (event) => {
			const win = BrowserWindow.fromWebContents(event.sender);
			if (win) win.close();
		});

		const compactBounds = new Map<number, Electron.Rectangle>();

		ipcMain.on(WindowChannels.setCompact, (event, compact: boolean) => {
			const win = BrowserWindow.fromWebContents(event.sender);
			if (!win) return;
			if (compact) {
				if (!compactBounds.has(win.id)) compactBounds.set(win.id, win.getBounds());
				win.setBounds({ width: 100, height: 100 }, true);
			} else {
				const bounds = compactBounds.get(win.id);
				if (!bounds) return;
				compactBounds.delete(win.id);
				win.setBounds(bounds, true);
			}
			if (process.platform === 'darwin') {
				win.setWindowButtonVisibility(!compact);
			}
		});

		ipcMain.on(WindowChannels.popupMenu, (event) => {
			const win = BrowserWindow.fromWebContents(event.sender);
			if (win) {
				const menu = ElectronMenu.getApplicationMenu();
				if (menu) {
					menu.popup({ window: win });
				}
			}
		});

		// --- Query handlers (invoke/handle) ---

		ipcMain.handle(
			WindowChannels.isMaximized,
			wrapIpcHandler((event) => {
				const win = BrowserWindow.fromWebContents(event.sender);
				return win ? win.isMaximized() : false;
			}, 'window:is-maximized')
		);

		ipcMain.handle(
			WindowChannels.isFullScreen,
			wrapIpcHandler((event) => {
				const win = BrowserWindow.fromWebContents(event.sender);
				return win ? win.isFullScreen() : false;
			}, 'window:is-fullscreen')
		);

		logger.info('WindowIpc', `Registered ${this.name} module`);
	}
}
