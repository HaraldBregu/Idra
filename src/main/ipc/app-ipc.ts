import { ipcMain, BrowserWindow, nativeTheme, shell, dialog, app } from 'electron';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { StoreService } from '../store';
import type { LoggerService } from '../logger';
import type { ThemeService } from '../theme';
import type { CronService } from '../cron';
import type { ChannelRegistry } from '../channels';
import { StoreValidators } from '../shared/validators';
import { wrapSimpleHandler } from './ipc-error-handler';
import { AppChannels } from '../../shared/channels';
import { isThemeMode } from '../../shared/theme';
import type {
	AgentSettings,
	ChannelType,
	CronJobInfo,
	CronTickEvent,
	ProviderEntry,
	ProviderModelInfo,
	TelegramChannelProperties,
	UserProfile,
	ThemeMode,
	WhatsappChannelProperties,
	DiscordChannelProperties,
} from '../../shared/types';

/**
 * Per-provider strategy for the `/models` endpoint. Each entry encapsulates
 * the URL, auth header(s), and the parser that normalises the provider's
 * response into ProviderModelInfo[].
 */
interface ProviderModelsStrategy {
	url: string;
	headers: (apiKey: string) => Record<string, string>;
	parse: (body: unknown) => ProviderModelInfo[];
}

const PROVIDER_MODELS_STRATEGIES: Record<string, ProviderModelsStrategy> = {};

async function fetchProviderModels(
	providerId: string,
	store: StoreService
): Promise<ProviderModelInfo[]> {
	if (typeof providerId !== 'string' || providerId.trim().length === 0) {
		throw new Error('providerId must be a non-empty string');
	}
	const normalized = providerId.trim().toLowerCase();

	const provider = store.getAssistantAiSettings().providers.find((entry) => entry.id === normalized);
	if (!provider || !provider.apiKey) {
		throw new Error(`No API key configured for provider "${providerId}"`);
	}

	if (normalized === 'openai') {
		const openai = new OpenAI({ apiKey: provider.apiKey });
		const result: ProviderModelInfo[] = [];
		const list = await openai.models.list();
		for await (const model of list) {
			result.push({
				id: model.id,
				name: model.id,
				createdAt: model.created > 0 ? new Date(model.created * 1000).toISOString() : '',
				ownedBy: model.owned_by ?? 'openai',
			});
		}
		return result;
	}

	if (normalized === 'anthropic') {
		const anthropic = new Anthropic({ apiKey: provider.apiKey });
		const result: ProviderModelInfo[] = [];
		for await (const model of anthropic.beta.models.list()) {
			result.push({
				id: model.id,
				name: model.display_name && model.display_name.length > 0 ? model.display_name : model.id,
				createdAt: typeof model.created_at === 'string' ? model.created_at : '',
				ownedBy: 'anthropic',
			});
		}
		return result;
	}

	const strategy = PROVIDER_MODELS_STRATEGIES[normalized];
	if (!strategy) {
		throw new Error(`Provider "${providerId}" is not supported by getModels`);
	}

	const response = await fetch(strategy.url, { headers: strategy.headers(provider.apiKey) });

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(
			`Failed to fetch models for "${providerId}": ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`
		);
	}

	const json = (await response.json()) as unknown;
	return strategy.parse(json);
}

/**
 * IPC handlers for custom application-specific operations.
 * Includes sound playback, context menu handling, and AI model store operations
 * (formerly in StoreIpc, now consolidated here and exposed on window.app).
 */
const VALID_LANGUAGES = ['en', 'it'] as const;

export class AppIpc implements IpcModule {
	readonly name = 'app';

	private lastTheme: ThemeMode | null = null;
	private lastLanguage: string | null = null;
	private trayEnabled = true;
	private readonly agents = new Map<string, AgentSettings>();

	register(container: ServiceContainer, eventBus: EventBus): void {
		const store = container.get<StoreService>('store');
		const logger = container.get<LoggerService>('logger');

		// Language handler
		ipcMain.on(AppChannels.setLanguage, (event, language: string) => {
			if (!VALID_LANGUAGES.includes(language as (typeof VALID_LANGUAGES)[number])) return;
			if (this.lastLanguage === language) return;
			this.lastLanguage = language;

			const senderContents = event.sender;
			BrowserWindow.getAllWindows().forEach((win) => {
				if (!win.isDestroyed() && win.webContents !== senderContents) {
					win.webContents.send(AppChannels.changeLanguage, language);
				}
			});
		});

		// Theme handler
		ipcMain.on(AppChannels.setTheme, (event, theme: string) => {
			if (!isThemeMode(theme)) return;
			if (this.lastTheme === theme) return;
			this.lastTheme = theme;

			nativeTheme.themeSource = theme;
			eventBus.emit('theme:changed', { theme });

			const senderContents = event.sender;
			BrowserWindow.getAllWindows().forEach((win) => {
				if (!win.isDestroyed() && win.webContents !== senderContents) {
					win.webContents.send(AppChannels.changeTheme, theme);
				}
			});
		});

		// -----------------------------------------------------------------------
		// Provider management handlers
		// -----------------------------------------------------------------------

		ipcMain.handle(
			AppChannels.getProviders,
			wrapSimpleHandler(() => store.getProviders(), AppChannels.getProviders)
		);

		ipcMain.handle(
			AppChannels.addProvider,
			wrapSimpleHandler((provider: ProviderEntry) => {
				StoreValidators.validateProvider(provider);
				return store.addProvider(provider);
			}, AppChannels.addProvider)
		);

		ipcMain.handle(
			AppChannels.deleteProvider,
			wrapSimpleHandler((id: string) => {
				StoreValidators.validateProviderId(id);
				return store.deleteProvider(id);
			}, AppChannels.deleteProvider)
		);

		ipcMain.handle(
			AppChannels.getAgents,
			wrapSimpleHandler(() => Array.from(this.agents.values()), AppChannels.getAgents)
		);

		ipcMain.handle(
			AppChannels.updateAgent,
			wrapSimpleHandler((agent: AgentSettings) => {
				StoreValidators.validateAgentSettings(agent);
				this.agents.set(agent.id, agent);
				return agent;
			}, AppChannels.updateAgent)
		);

		ipcMain.handle(
			AppChannels.getStartupInfo,
			wrapSimpleHandler(() => store.getStartupInfo(), AppChannels.getStartupInfo)
		);

		ipcMain.handle(
			AppChannels.getProfile,
			wrapSimpleHandler(() => store.getProfile(), AppChannels.getProfile)
		);

		ipcMain.handle(
			AppChannels.setProfile,
			wrapSimpleHandler(
				(profile: UserProfile) => store.setProfile(profile),
				AppChannels.setProfile
			)
		);

		ipcMain.handle(
			AppChannels.completeFirstRunConfiguration,
			wrapSimpleHandler((profile: UserProfile, providers: ProviderEntry[]) => {
				StoreValidators.validateProviders(providers);
				return store.completeFirstRunConfiguration(profile, providers);
			}, AppChannels.completeFirstRunConfiguration)
		);

		ipcMain.handle(
			AppChannels.getModels,
			wrapSimpleHandler(
				(providerId: string) => fetchProviderModels(providerId, store),
				AppChannels.getModels
			)
		);

		// -----------------------------------------------------------------------
		// Channel (messaging adapters)
		// -----------------------------------------------------------------------

		ipcMain.handle(
			AppChannels.getChannel,
			wrapSimpleHandler(() => store.getChannel(), AppChannels.getChannel)
		);

		ipcMain.handle(
			AppChannels.setChannelProperties,
			wrapSimpleHandler(
				(
					type: ChannelType,
					properties:
						| TelegramChannelProperties
						| WhatsappChannelProperties
						| DiscordChannelProperties
				) => store.setChannelProperties(type, properties),
				AppChannels.setChannelProperties
			)
		);

		const channelRegistry = container.get<ChannelRegistry>('channelRegistry');

		ipcMain.handle(
			AppChannels.getChannelStatus,
			wrapSimpleHandler(() => channelRegistry.getStatus(), AppChannels.getChannelStatus)
		);

		ipcMain.handle(
			AppChannels.restartChannel,
			wrapSimpleHandler(
				(type: ChannelType) => channelRegistry.restart(type),
				AppChannels.restartChannel
			)
		);

		ipcMain.handle(
			AppChannels.requestWhatsappPairingCode,
			wrapSimpleHandler(
				(phoneNumber: string) => channelRegistry.requestWhatsappPairingCode(phoneNumber),
				AppChannels.requestWhatsappPairingCode
			)
		);

		// Recent in-memory logs
		ipcMain.handle(
			AppChannels.getLogs,
			wrapSimpleHandler((limit?: number) => logger.getRecentLogs(limit), AppChannels.getLogs)
		);

		// Open logs folder in system file explorer
		ipcMain.handle(
			AppChannels.openLogsFolder,
			wrapSimpleHandler(async () => {
				const logsDir = logger.getLogDirectory();
				if (logsDir) {
					await shell.openPath(logsDir);
				}
			}, AppChannels.openLogsFolder)
		);

		// Open application data folder in system file explorer
		ipcMain.handle(
			AppChannels.openAppDataFolder,
			wrapSimpleHandler(async () => {
				await shell.openPath(app.getPath('userData'));
			}, AppChannels.openAppDataFolder)
		);

		// -----------------------------------------------------------------------
		// Theme management handlers
		// -----------------------------------------------------------------------

		const themeService = container.get<ThemeService>('themeService');

		ipcMain.handle(
			AppChannels.getCustomThemes,
			wrapSimpleHandler(() => themeService.listThemes(), AppChannels.getCustomThemes)
		);

		ipcMain.handle(
			AppChannels.openThemesFolder,
			wrapSimpleHandler(async () => {
				const themesDir = themeService.getThemesDirectory();
				await shell.openPath(themesDir);
			}, AppChannels.openThemesFolder)
		);

		ipcMain.handle(
			AppChannels.getCustomThemeTokens,
			wrapSimpleHandler(
				(id: string) => themeService.getThemeById(id),
				AppChannels.getCustomThemeTokens
			)
		);

		ipcMain.handle(
			AppChannels.deleteTheme,
			wrapSimpleHandler((id: string) => themeService.deleteTheme(id), AppChannels.deleteTheme)
		);

		ipcMain.handle(
			AppChannels.importTheme,
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
			}, AppChannels.importTheme)
		);

		// -----------------------------------------------------------------------
		// System settings handlers (macOS)
		// -----------------------------------------------------------------------

		ipcMain.handle(
			AppChannels.openSystemAccessibility,
			wrapSimpleHandler(async () => {
				if (process.platform === 'darwin') {
					await shell.openExternal(
						'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
					);
				}
			}, AppChannels.openSystemAccessibility)
		);

		ipcMain.handle(
			AppChannels.openSystemScreenRecording,
			wrapSimpleHandler(async () => {
				if (process.platform === 'darwin') {
					await shell.openExternal(
						'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
					);
				}
			}, AppChannels.openSystemScreenRecording)
		);

		// -----------------------------------------------------------------------
		// Tray toggle handlers
		// -----------------------------------------------------------------------

		ipcMain.handle(
			AppChannels.setTrayEnabled,
			wrapSimpleHandler((enabled: boolean) => {
				this.trayEnabled = enabled;
				eventBus.emit('tray:set-enabled', { enabled });
			}, AppChannels.setTrayEnabled)
		);

		ipcMain.handle(
			AppChannels.getTrayEnabled,
			wrapSimpleHandler(() => {
				return this.trayEnabled;
			}, AppChannels.getTrayEnabled)
		);

		// -----------------------------------------------------------------------
		// Cron job handlers
		// -----------------------------------------------------------------------

		const cronService = container.get<CronService>('cronService');

		const broadcastCronTick = (id: string): void => {
			const event: CronTickEvent = { id, firedAt: new Date().toISOString() };
			BrowserWindow.getAllWindows().forEach((win) => {
				if (!win.isDestroyed()) {
					win.webContents.send(AppChannels.cronTick, event);
				}
			});
		};

		ipcMain.handle(
			AppChannels.cronSchedule,
			wrapSimpleHandler(
				(params: {
					id: string;
					expression: string;
					timezone?: string;
					runOnStart?: boolean;
				}): CronJobInfo => {
					if (typeof params?.id !== 'string' || params.id.trim().length === 0) {
						throw new Error('id must be a non-empty string');
					}
					if (typeof params.expression !== 'string' || params.expression.trim().length === 0) {
						throw new Error('expression must be a non-empty string');
					}
					cronService.schedule(
						params.id,
						params.expression,
						() => broadcastCronTick(params.id),
						{ timezone: params.timezone, runOnStart: params.runOnStart }
					);
					return { id: params.id, expression: params.expression };
				},
				AppChannels.cronSchedule
			)
		);

		ipcMain.handle(
			AppChannels.cronUnschedule,
			wrapSimpleHandler((id: string) => cronService.unschedule(id), AppChannels.cronUnschedule)
		);

		ipcMain.handle(
			AppChannels.cronListJobs,
			wrapSimpleHandler(() => cronService.listJobs(), AppChannels.cronListJobs)
		);

		logger.info('AppIpc', `Registered ${this.name} module`);
	}
}
