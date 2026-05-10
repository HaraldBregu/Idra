import { ipcMain, BrowserWindow, nativeTheme, shell, dialog, app } from 'electron';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { ThemeService } from '../theme';
import type { StoreService } from '../store';
import type { Model } from '../../shared/service';
import type { PublicProvider } from '../../shared/providers';
import { wrapSimpleHandler } from './ipc-error-handler';
import { isThemeMode, ThemeMode } from '../../shared';
import { ProviderChannels } from '../../shared/channels';


const VALID_LANGUAGES = ['en', 'it'] as const;

async function getOpenAiModels(apiKey: string): Promise<Model[]> {
	const client = new OpenAI({ apiKey });
	const models = await client.models.list();

	return models.data.map((model) => ({
		id: model.id,
		name: model.id,
	}));
}

async function getAnthropicModels(apiKey: string): Promise<Model[]> {
	const client = new Anthropic({ apiKey });
	const models = await client.models.list();

	return models.data.map((model) => ({
		id: model.id,
		name: model.display_name,
	}));
}

export class AppIpc implements IpcModule {
	readonly name = 'app';

	private lastTheme: ThemeMode | null = null;
	private lastLanguage: string | null = null;
	private trayEnabled = true;

	register(container: ServiceContainer, eventBus: EventBus): void {
		const logger = container.get<LoggerService>('logger');
		const store = container.get<StoreService>('store');

		// Language handler
		ipcMain.on('set-language', (event, language: string) => {
			if (!VALID_LANGUAGES.includes(language as (typeof VALID_LANGUAGES)[number])) return;
			if (this.lastLanguage === language) return;
			this.lastLanguage = language;

			const senderContents = event.sender;
			BrowserWindow.getAllWindows().forEach((win) => {
				if (!win.isDestroyed() && win.webContents !== senderContents) {
					win.webContents.send('change-language', language);
				}
			});
		});

		// Theme handler
		ipcMain.on('set-theme', (event, theme: string) => {
			if (!isThemeMode(theme)) return;
			if (this.lastTheme === theme) return;
			this.lastTheme = theme;

			nativeTheme.themeSource = theme;
			eventBus.emit('theme:changed', { theme });

			const senderContents = event.sender;
			BrowserWindow.getAllWindows().forEach((win) => {
				if (!win.isDestroyed() && win.webContents !== senderContents) {
					win.webContents.send('change-theme', theme);
				}
			});
		});

		// Recent in-memory logs
		ipcMain.handle(
			'app:get-logs',
			wrapSimpleHandler((limit?: number) => logger.getRecentLogs(limit), 'app:get-logs')
		);

		// Open logs folder in system file explorer
		ipcMain.handle(
			'app:open-logs-folder',
			wrapSimpleHandler(async () => {
				const logsDir = logger.getLogDirectory();
				if (logsDir) {
					await shell.openPath(logsDir);
				}
			}, 'app:open-logs-folder')
		);

		// Open application data folder in system file explorer
		ipcMain.handle(
			'app:open-app-data-folder',
			wrapSimpleHandler(async () => {
				await shell.openPath(app.getPath('userData'));
			}, 'app:open-app-data-folder')
		);

		// -----------------------------------------------------------------------
		// Theme management handlers
		// -----------------------------------------------------------------------

		const themeService = container.get<ThemeService>('themeService');

		ipcMain.handle(
			'app:get-custom-themes',
			wrapSimpleHandler(() => themeService.listThemes(), 'app:get-custom-themes')
		);

		ipcMain.handle(
			'app:open-themes-folder',
			wrapSimpleHandler(async () => {
				const themesDir = themeService.getThemesDirectory();
				await shell.openPath(themesDir);
			}, 'app:open-themes-folder')
		);

		ipcMain.handle(
			'app:get-custom-theme-tokens',
			wrapSimpleHandler(
				(id: string) => themeService.getThemeById(id),
				'app:get-custom-theme-tokens'
			)
		);

		ipcMain.handle(
			'app:delete-theme',
			wrapSimpleHandler((id: string) => themeService.deleteTheme(id), 'app:delete-theme')
		);

		ipcMain.handle(
			'app:import-theme',
			wrapSimpleHandler(async () => {
				const result = await dialog.showOpenDialog({
					properties: ['openDirectory'],
					title: 'Select Theme Folder',
					buttonLabel: 'Import Theme',
				});
				if (result.canceled || result.filePaths.length === 0) {
					return null;
				}
				return themeService.importThemeFromPath(result.filePaths[0]);
			}, 'app:import-theme')
		);

		ipcMain.handle(
			'app:set-tray-enabled',
			wrapSimpleHandler((enabled: boolean) => {
				this.trayEnabled = enabled;
				eventBus.emit('tray:set-enabled', { enabled });
			}, 'app:set-tray-enabled')
		);

		ipcMain.handle(
			'app:get-tray-enabled',
			wrapSimpleHandler(() => {
				return this.trayEnabled;
			}, 'app:get-tray-enabled')
		);

		ipcMain.handle(
			ProviderChannels.setApiKey,
			wrapSimpleHandler((providerId: string, apiKey: string) => {
				const normalizedProviderId = providerId.trim().toLowerCase();
				const trimmedApiKey = apiKey.trim();

				if (!trimmedApiKey) {
					throw new Error('API key is required.');
				}

				if (normalizedProviderId === 'openai') {
					store.setOpenAiApiKey(trimmedApiKey);
					return;
				}

				if (normalizedProviderId === 'anthropic') {
					store.setAnthropicApiKey(trimmedApiKey);
					return;
				}

				throw new Error(`Unsupported provider id: ${providerId}`);
			}, ProviderChannels.setApiKey)
		);

		ipcMain.handle(
			ProviderChannels.isApiKeySaved,
			wrapSimpleHandler((providerId: string): boolean => {
				const normalizedProviderId = providerId.trim().toLowerCase();
				const provider = store
					.getProviders()
					.find((item) => item.id.trim().toLowerCase() === normalizedProviderId);

				return (provider?.apiKey.trim().length ?? 0) > 0;
			}, ProviderChannels.isApiKeySaved)
		);

		ipcMain.handle(
			ProviderChannels.getAll,
			wrapSimpleHandler(
				(): PublicProvider[] =>
					store.getProviders().map(({ apiKey: _apiKey, ...rest }) => rest),
				ProviderChannels.getAll
			)
		);

		ipcMain.handle(
			ProviderChannels.getModels,
			wrapSimpleHandler(async (provider: PublicProvider) => {
				const storedProvider = store.getProviderById(provider.id);
				if (!storedProvider) {
					throw new Error(`Provider not found: ${provider.id}`);
				}

				const apiKey = storedProvider.apiKey.trim();
				if (!apiKey) {
					throw new Error(`API key not configured for provider: ${storedProvider.id}`);
				}

				const normalizedProviderId = storedProvider.id.trim().toLowerCase();

				if (normalizedProviderId === 'openai') {
					return getOpenAiModels(apiKey);
				}

				if (normalizedProviderId === 'anthropic') {
					return getAnthropicModels(apiKey);
				}

				throw new Error(`Unsupported provider id: ${storedProvider.id}`);
			}, ProviderChannels.getModels)
		);

		ipcMain.handle(
			ProviderChannels.saveAssistantService,
			wrapSimpleHandler((provider: PublicProvider, model: Model) => {
				return store.setAssistantService(provider.id, model);
			}, ProviderChannels.saveAssistantService)
		);

		logger.info('AppIpc', `Registered ${this.name} module`);
	}
}
