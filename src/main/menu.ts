import path from 'node:path';
import { app, BrowserWindow, Menu as ElectronMenu } from 'electron';
import { loadTranslations } from './i18n';
import type { ThemeMode } from '../shared';
import type { AppInfo } from '../shared/apps';
import type { AppsService } from './apps';
import type { LoggerService } from './logger';

interface MenuManagerCallbacks {
	onLanguageChange: (lng: string) => void;
	onThemeChange: (theme: ThemeMode) => void;
	onNewWindow: () => void;
}

export class Menu {
	private currentLanguage = 'en';
	private currentTheme: ThemeMode = 'system';
	private callbacks: MenuManagerCallbacks;
	private apps: AppInfo[] = [];

	constructor(
		callbacks: MenuManagerCallbacks,
		private readonly appsService?: AppsService,
		private readonly logger?: LoggerService
	) {
		this.callbacks = callbacks;
	}

	async refreshApps(): Promise<void> {
		if (!this.appsService) return;
		try {
			this.apps = await this.appsService.list();
		} catch (err) {
			this.logger?.error('Menu', 'Failed to list apps', err);
			this.apps = [];
		}
		this.buildMenu();
	}

	private openApp(appInfo: AppInfo): void {
		const htmlPath = path.join(appInfo.folderPath, 'index.html');
		const win = new BrowserWindow({
			width: 900,
			height: 700,
			title: appInfo.manifest.name,
			webPreferences: {
				sandbox: true,
				nodeIntegration: false,
				contextIsolation: true,
			},
		});
		win.loadFile(htmlPath).catch((err) => {
			this.logger?.error('Menu', `Failed to load app ${appInfo.id}`, err);
		});
	}

	create(): void {
		this.buildMenu();
	}

	updateLanguage(lng: string): void {
		this.currentLanguage = lng;
		this.buildMenu();
	}

	updateTheme(theme: ThemeMode): void {
		this.currentTheme = theme;
		this.buildMenu();
	}

	private buildMenu(): void {
		const isMac = process.platform === 'darwin';
		const m = loadTranslations(this.currentLanguage, 'menu');

		const switchLanguage = (lng: string): void => {
			this.currentLanguage = lng;
			this.buildMenu();
			this.callbacks.onLanguageChange(lng);
		};

		const switchTheme = (theme: ThemeMode): void => {
			this.currentTheme = theme;
			this.buildMenu();
			this.callbacks.onThemeChange(theme);
		};

		const template: Electron.MenuItemConstructorOptions[] = [
			...(isMac
				? [
						{
							label: app.name,
							submenu: [
								{ label: m.about, role: 'about' as const },
								{ type: 'separator' as const },
								{ label: m.services, role: 'services' as const },
								{ type: 'separator' as const },
								{ label: m.hide, role: 'hide' as const },
								{ label: m.hideOthers, role: 'hideOthers' as const },
								{ label: m.unhide, role: 'unhide' as const },
								{ type: 'separator' as const },
								{ label: m.quit, role: 'quit' as const },
							],
						},
					]
				: []),
			{
				label: m.file,
				submenu: [
					{
						label: m.newWindow,
						accelerator: 'CmdOrCtrl+N',
						click: (): void => {
							this.callbacks.onNewWindow();
						},
					},
					isMac
						? { label: m.close, role: 'close' as const }
						: { label: m.quit, role: 'quit' as const },
				],
			},
			{
				label: m.edit,
				submenu: [
					{ label: m.undo, role: 'undo' as const },
					{ label: m.redo, role: 'redo' as const },
					{ type: 'separator' as const },
					{ label: m.cut, role: 'cut' as const },
					{ label: m.copy, role: 'copy' as const },
					{ label: m.paste, role: 'paste' as const },
					{ label: m.selectAll, role: 'selectAll' as const },
				],
			},
			{
				label: m.view,
				submenu: [
					{ label: m.reload, role: 'reload' as const },
					{ label: m.forceReload, role: 'forceReload' as const },
				],
			},
			{
				label: m.window,
				submenu: [
					{ label: m.minimize, role: 'minimize' as const },
					...(isMac
						? [{ type: 'separator' as const }, { label: m.front, role: 'front' as const }]
						: [{ label: m.close, role: 'close' as const }]),
				],
			},
			{
				label: m.developer,
				submenu: [
					{
						label: m.language,
						submenu: [
							{
								label: 'English',
								type: 'radio' as const,
								checked: this.currentLanguage === 'en',
								click: (): void => switchLanguage('en'),
							},
							{
								label: 'Italiano',
								type: 'radio' as const,
								checked: this.currentLanguage === 'it',
								click: (): void => switchLanguage('it'),
							},
						],
					},
					{
						label: m.theme,
						submenu: [
							{
								label: m.light,
								type: 'radio' as const,
								checked: this.currentTheme === 'light',
								click: (): void => switchTheme('light'),
							},
							{
								label: m.dark,
								type: 'radio' as const,
								checked: this.currentTheme === 'dark',
								click: (): void => switchTheme('dark'),
							},
							{
								label: m.system,
								type: 'radio' as const,
								checked: this.currentTheme === 'system',
								click: (): void => switchTheme('system'),
							},
						],
					},
					{ type: 'separator' as const },
					{
						label: m.logs,
						click: (): void => {
							const win = BrowserWindow.getFocusedWindow();
							if (win) win.webContents.send('app:open-logs-dialog');
						},
					},
					{
						label: m.redux,
						click: (): void => {
							const win = BrowserWindow.getFocusedWindow();
							if (win) win.webContents.send('app:open-redux-dialog');
						},
					},
					{
						label: m.cron,
						click: (): void => {
							const win = BrowserWindow.getFocusedWindow();
							if (win) win.webContents.send('app:open-cron-dialog');
						},
					},
					{ type: 'separator' as const },
					{
						label: m.apps,
						submenu:
							this.apps.length > 0
								? this.apps.map((appInfo) => ({
										label: appInfo.manifest.name,
										click: (): void => this.openApp(appInfo),
									}))
								: [{ label: m.appsEmpty, enabled: false }],
					},
					{ type: 'separator' as const },
					{
						label: m.showConsole,
						accelerator: 'CmdOrCtrl+Shift+I',
						click: (): void => {
							const win = BrowserWindow.getFocusedWindow();
							if (win) win.webContents.toggleDevTools();
						},
					},
					{
						label: m.refresh,
						accelerator: 'CmdOrCtrl+R',
						click: (): void => {
							const win = BrowserWindow.getFocusedWindow();
							if (win) win.webContents.reload();
						},
					},
				],
			},
		];

		if (!isMac) {
			// On Windows/Linux the custom React TitleBar handles all menu actions.
			// Setting the menu and then hiding the bar keeps keyboard accelerators
			// (Ctrl+C/V/X/Z etc.) working while removing the native menu bar
			// (including the Alt-key overlay).
			const menu = ElectronMenu.buildFromTemplate(template);
			ElectronMenu.setApplicationMenu(menu);
			BrowserWindow.getAllWindows().forEach((win) => {
				win.setMenuBarVisibility(false);
				win.autoHideMenuBar = true;
			});
			return;
		}

		const menu = ElectronMenu.buildFromTemplate(template);
		ElectronMenu.setApplicationMenu(menu);
	}
}
