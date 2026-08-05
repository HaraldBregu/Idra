import { app, BrowserWindow, Menu as ElectronMenu } from 'electron';
import { loadTranslations } from '../i18n';
import type { Extension } from '../extensions/extension_index';

interface MenuManagerCallbacks {
	onLanguageChange: (lng: string) => void;
	onNewWindow: () => void;
	getExtensions: () => Extension[];
	onOpenExtension: (extension: Extension) => void;
}

export class Menu {
	private currentLanguage = 'en';
	private callbacks: MenuManagerCallbacks;
	constructor(callbacks: MenuManagerCallbacks) {
		this.callbacks = callbacks;
	}


	create(): void {
		this.buildMenu();
	}

	updateLanguage(lng: string): void {
		this.currentLanguage = lng;
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
				label: m.extensions,
				submenu: this.callbacks.getExtensions().map((extension) => ({
					label: extension.title,
					click: (): void => this.callbacks.onOpenExtension(extension),
				})),
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
