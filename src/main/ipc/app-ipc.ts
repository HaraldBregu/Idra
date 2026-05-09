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

		// -----------------------------------------------------------------------
		// Provider management handlers
		// -----------------------------------------------------------------------

		ipcMain.handle(
			'app:get-assistant-ai-settings',
			wrapSimpleHandler(
				() => store.getAssistantAiSettings(),
				'app:get-assistant-ai-settings'
			)
		);

		ipcMain.handle(
			'app:set-assistant-ai-provider-api-key',
			wrapSimpleHandler(
				(providerId: string, apiKey: string) =>
					store.setAssistantAiProviderApiKey(providerId, apiKey),
				'app:set-assistant-ai-provider-api-key'
			)
		);

		ipcMain.handle(
			'app:set-assistant-ai-selection',
			wrapSimpleHandler(
				(selection: AssistantAiSelection) => store.setAssistantAiSelection(selection),
				'app:set-assistant-ai-selection'
			)
		);

		ipcMain.handle(
			'app:get-providers',
			wrapSimpleHandler(() => store.getProviders(), 'app:get-providers')
		);

		ipcMain.handle(
			'app:add-provider',
			wrapSimpleHandler((provider: ProviderEntry) => {
				StoreValidators.validateProvider(provider);
				return store.addProvider(provider);
			}, 'app:add-provider')
		);

		ipcMain.handle(
			'app:delete-provider',
			wrapSimpleHandler((id: string) => {
				StoreValidators.validateProviderId(id);
				return store.deleteProvider(id);
			}, 'app:delete-provider')
		);

		ipcMain.handle(
			'app:get-agents',
			wrapSimpleHandler(() => Array.from(this.agents.values()), 'app:get-agents')
		);

		ipcMain.handle(
			'app:update-agent',
			wrapSimpleHandler((agent: AgentSettings) => {
				StoreValidators.validateAgentSettings(agent);
				this.agents.set(agent.id, agent);
				return agent;
			}, 'app:update-agent')
		);

		ipcMain.handle(
			'app:get-startup-info',
			wrapSimpleHandler(() => store.getStartupInfo(), 'app:get-startup-info')
		);

		ipcMain.handle(
			'app:get-profile',
			wrapSimpleHandler(() => store.getProfile(), 'app:get-profile')
		);

		ipcMain.handle(
			'app:set-profile',
			wrapSimpleHandler(
				(profile: UserProfile) => store.setProfile(profile),
				'app:set-profile'
			)
		);

		ipcMain.handle(
			'app:complete-first-run-configuration',
			wrapSimpleHandler((profile: UserProfile, providers: ProviderEntry[]) => {
				StoreValidators.validateProviders(providers);
				return store.completeFirstRunConfiguration(profile, providers);
			}, 'app:complete-first-run-configuration')
		);

		ipcMain.handle(
			'app:get-models',
			wrapSimpleHandler(
				(providerId: string) => fetchProviderModels(providerId, store),
				'app:get-models'
			)
		);

		// -----------------------------------------------------------------------
		// Channel (messaging adapters)
		// -----------------------------------------------------------------------

		ipcMain.handle(
			'app:get-channel',
			wrapSimpleHandler(() => store.getChannel(), 'app:get-channel')
		);

		ipcMain.handle(
			'app:set-channel-properties',
			wrapSimpleHandler(
				(
					type: ChannelType,
					properties:
						| TelegramChannelProperties
						| WhatsappChannelProperties
						| DiscordChannelProperties
				) => store.setChannelProperties(type, properties),
				'app:set-channel-properties'
			)
		);

		const channelRegistry = container.get<ChannelRegistry>('channelRegistry');

		ipcMain.handle(
			'app:get-channel-status',
			wrapSimpleHandler(() => channelRegistry.getStatus(), 'app:get-channel-status')
		);

		ipcMain.handle(
			'app:restart-channel',
			wrapSimpleHandler(
				(type: ChannelType) => channelRegistry.restart(type),
				'app:restart-channel'
			)
		);

		ipcMain.handle(
			'app:request-whatsapp-pairing-code',
			wrapSimpleHandler(
				(phoneNumber: string) => channelRegistry.requestWhatsappPairingCode(phoneNumber),
				'app:request-whatsapp-pairing-code'
			)
		);

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

		// -----------------------------------------------------------------------
		// System settings handlers (macOS)
		// -----------------------------------------------------------------------

		ipcMain.handle(
			'app:open-system-accessibility',
			wrapSimpleHandler(async () => {
				if (process.platform === 'darwin') {
					await shell.openExternal(
						'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
					);
				}
			}, 'app:open-system-accessibility')
		);

		ipcMain.handle(
			'app:open-system-screen-recording',
			wrapSimpleHandler(async () => {
				if (process.platform === 'darwin') {
					await shell.openExternal(
						'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
					);
				}
			}, 'app:open-system-screen-recording')
		);

		// -----------------------------------------------------------------------
		// Tray toggle handlers
		// -----------------------------------------------------------------------

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

		// -----------------------------------------------------------------------
		// Cron job handlers
		// -----------------------------------------------------------------------

		const cronService = container.get<CronService>('cronService');

		const broadcastCronTick = (id: string): void => {
			const event: CronTickEvent = { id, firedAt: new Date().toISOString() };
			BrowserWindow.getAllWindows().forEach((win) => {
				if (!win.isDestroyed()) {
					win.webContents.send('app:cron-tick', event);
				}
			});
		};

		ipcMain.handle(
			'app:cron-schedule',
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
				'app:cron-schedule'
			)
		);

		ipcMain.handle(
			'app:cron-unschedule',
			wrapSimpleHandler((id: string) => cronService.unschedule(id), 'app:cron-unschedule')
		);

		ipcMain.handle(
			'app:cron-list-jobs',
			wrapSimpleHandler(() => cronService.listJobs(), 'app:cron-list-jobs')
		);

		logger.info('AppIpc', `Registered ${this.name} module`);
	}
}
import type { AssistantAiSelection } from '../../shared/types';
