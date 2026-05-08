import { Tray as ElectronTray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import { is } from '@electron-toolkit/utils';
import { loadTranslations } from './i18n';

interface TrayManagerCallbacks {
	onShowApp: () => void;
	onHideApp: () => void;
	onToggleApp: () => void;
	onQuit: () => void;
	isAppVisible: () => boolean;
}

export class Tray {
	private tray: ElectronTray | null = null;
	private currentLanguage = 'en';
	private callbacks: TrayManagerCallbacks;

	constructor(callbacks: TrayManagerCallbacks) {
		this.callbacks = callbacks;
	}

	create(): void {
		const icon = nativeImage.createFromPath(
			is.dev
				? path.join(__dirname, '../../resources/icons/icon.png')
				: path.join(process.resourcesPath, 'resources/icons/icon.png')
		);

		this.tray = new ElectronTray(icon.resize({ width: 16, height: 16 }));
		this.tray.setToolTip('Friday');

		// Double-click to show/hide app
		this.tray.on('double-click', () => {
			this.callbacks.onToggleApp();
			// Rebuild menu to update show/hide label
			this.buildContextMenu();
		});

		this.buildContextMenu();
	}

	destroy(): void {
		if (this.tray) {
			this.tray.destroy();
			this.tray = null;
		}
	}

	isCreated(): boolean {
		return this.tray !== null;
	}

	updateLanguage(lng: string): void {
		this.currentLanguage = lng;
		this.buildContextMenu();
	}

	/**
	 * Rebuild the context menu (useful for updating dynamic labels)
	 */
	updateContextMenu(): void {
		this.buildContextMenu();
	}

	private buildContextMenu(): void {
		if (!this.tray) return;
		const m = loadTranslations(this.currentLanguage, 'tray');
		const isVisible = this.callbacks.isAppVisible();

		const contextMenu = Menu.buildFromTemplate([
			{
				label: isVisible ? m.hideFriday || 'Hide Friday' : m.showFriday || 'Show Friday',
				click: () => {
					this.callbacks.onToggleApp();
					// Rebuild menu after toggle to update the label
					setTimeout(() => this.buildContextMenu(), 100);
				},
			},
			{ type: 'separator' },
			{
				label: m.quit,
				click: () => this.callbacks.onQuit(),
			},
		]);

		this.tray.setContextMenu(contextMenu);
	}
}
