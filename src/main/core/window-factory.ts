import { BrowserWindow, BrowserWindowConstructorOptions, shell } from 'electron';
import path from 'node:path';
import { is } from '@electron-toolkit/utils';
import type { LoggerService } from '../logger';
import { normalizeExternalUrl } from '../../shared/external-links';

export interface WindowPreset {
	name: string;
	options: Partial<BrowserWindowConstructorOptions>;
}

/**
 * Factory for creating BrowserWindow instances with consistent configuration.
 * Eliminates duplicated webPreferences and window config across Main
 * and WindowManagerService.
 */
export class WindowFactory {
	private readonly preloadPath: string;
	private readonly iconPath: string;

	constructor(private readonly logger?: LoggerService) {
		// Use path.resolve to ensure absolute path for preload
		// Output as .js (CommonJS) for Electron preload compatibility
		this.preloadPath = path.resolve(__dirname, '../preload/index.js');
		this.iconPath = path.resolve(__dirname, '../../resources/icons/icon.png');
		this.logger?.info('WindowFactory', `Preload path: ${this.preloadPath}`);
		// Verify preload file exists
		try {
			const { existsSync } = require('fs');
			const exists = existsSync(this.preloadPath);
			this.logger?.info('WindowFactory', `Preload file exists: ${exists}`);
		} catch {
			// Silent fail
		}
	}

	private getBaseWebPreferences(): Electron.WebPreferences {
		return {
			preload: this.preloadPath,
			sandbox: true,
			nodeIntegration: false,
			contextIsolation: true,
			devTools: is.dev,
			webSecurity: true,
			allowRunningInsecureContent: false,
			spellcheck: false,
		};
	}

	/**
	 * Create a BrowserWindow with base security defaults merged with overrides.
	 */
	create(overrides: Partial<BrowserWindowConstructorOptions> = {}): BrowserWindow {
		const options: BrowserWindowConstructorOptions = {
			width: 500,
			height: 700,
			minWidth: 500,
			minHeight: 600,
			show: false,
			icon: this.iconPath,
			...overrides,
			webPreferences: {
				...this.getBaseWebPreferences(),
				...overrides.webPreferences,
			},
		};

		const win = new BrowserWindow(options);

		// Prevent arbitrary window.open() calls from creating unrestricted windows
		win.webContents.setWindowOpenHandler(({ url }) => {
			const externalUrl = normalizeExternalUrl(url);
			if (externalUrl) {
				void shell.openExternal(externalUrl).catch((error) => {
					this.logger?.warn('WindowFactory', 'Failed to open external URL', {
						url: externalUrl,
						error,
					});
				});
			}
			return { action: 'deny' };
		});

		// Prevent navigation to external URLs
		win.webContents.on('will-navigate', (event, url) => {
			const appUrl = process.env['ELECTRON_RENDERER_URL'] || 'file://';
			if (is.dev) {
				// In dev mode, only allow navigation within the dev server
				if (!url.startsWith(appUrl) && !url.startsWith('file://')) {
					event.preventDefault();
				}
			} else {
				// In production, only allow file:// URLs (local files)
				if (!url.startsWith('file://')) {
					event.preventDefault();
				}
			}
		});

		this.loadContent(win);
		return win;
	}

	/**
	 * Load the renderer content (dev URL or production file).
	 */
	loadContent(win: BrowserWindow, hash?: string): void {
		if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
			const url = hash
				? `${process.env['ELECTRON_RENDERER_URL']}#/${hash}`
				: process.env['ELECTRON_RENDERER_URL'];
			win.loadURL(url);
		} else {
			const loadOptions = hash ? { hash } : undefined;
			win.loadFile(path.join(__dirname, '../renderer/index.html'), loadOptions);
		}
	}
}
