import {
	ipcMain,
	BrowserWindow,
	Menu as ElectronMenu,
	type MenuItemConstructorOptions,
} from 'electron';
import type { IpcModule } from './core/module';
import type { EventBus } from '../event_bus';
import { wrapIpcHandler } from './core/error_handler';
import { WindowChannels } from '../../shared/ipc_channels_definitions';
import type { LoggerService } from '../shared';
import type { ContextMenuDescriptor } from '../../shared/window_types';

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
 *
 * Channels (invoke/handle):
 *  - window:is-maximized  (query) -- Check if window is maximized
 *  - window:is-fullscreen (query) -- Check if window is in fullscreen
 *  - window:context-menu:show (command) -- Show a native context menu
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

		ipcMain.handle(
			WindowChannels.showContextMenu,
			wrapIpcHandler((event, items: ContextMenuDescriptor[]) => {
				const win = BrowserWindow.fromWebContents(event.sender);
				if (!win) return null;
				if (!Array.isArray(items) || items.length === 0) {
					throw new Error('Context menu requires at least one item.');
				}

				return new Promise<string | null>((resolve) => {
					let selectedId: string | null = null;
					const template: MenuItemConstructorOptions[] = items.map((item) => {
						if (item.type === 'separator') return { type: 'separator' };
						if (!item.id.trim() || !item.label.trim()) {
							throw new Error('Context menu items require an id and label.');
						}
						return {
							id: item.id,
							label: item.label,
							accelerator: item.accelerator,
							enabled: item.enabled ?? true,
							click: () => {
								selectedId = item.id;
							},
						};
					});

					const menu = ElectronMenu.buildFromTemplate(template);
					menu.once('menu-will-close', () => {
						setImmediate(() => resolve(selectedId));
					});
					menu.popup({ window: win });
				});
			}, WindowChannels.showContextMenu)
		);

		logger.info('WindowIpc', `Registered ${this.name} module`);
	}
}
