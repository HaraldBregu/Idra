import { app, ipcMain, BrowserWindow, nativeTheme, shell, systemPreferences } from 'electron';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import {
	SPEECH_TRANSCRIBER_MODELS,
	SPEECH_TRANSCRIBER_PROVIDER_ID,
	isModelReasoningEffort,
	normalizeModelReasoningEffort,
	type Agent,
	type Model,
} from '../../shared/service';
import type {
	MicrophonePermissionSettings,
	MicrophoneSystemPermissionStatus,
} from '../../shared/app-permissions';
import { DEFAULT_PROVIDERS, type ProviderInput, type PublicProvider } from '../../shared/providers';
import { wrapSimpleHandler } from './ipc-error-handler';
import { isThemeMode, ThemeMode } from '../../shared';
import { AppChannels, AppsChannels, ProviderChannels } from '../../shared/ipc-channels';
import { normalizeExternalUrl } from '../../shared/external-links';
import {
	filterSelectableAgentModels,
	isAllowedAgentModel,
} from '../provider/model-policy';

const VALID_LANGUAGES = ['en', 'it'] as const;

function getMicrophoneSystemStatus(): MicrophoneSystemPermissionStatus {
	if (process.platform !== 'darwin') return 'unknown';

	try {
		return systemPreferences.getMediaAccessStatus('microphone');
	} catch {
		return 'unknown';
	}
}

function canRequestMicrophoneAccess(status: MicrophoneSystemPermissionStatus): boolean {
	return process.platform === 'darwin' && status === 'not-determined';
}

function microphoneSettings(enabled: boolean): MicrophonePermissionSettings {
	const systemStatus = getMicrophoneSystemStatus();
	return {
		enabled,
		systemStatus,
		canRequest: canRequestMicrophoneAccess(systemStatus),
	};
}

async function openPathOrThrow(target: string): Promise<void> {
	const error = await shell.openPath(target);
	if (error) {
		throw new Error(error);
	}
}

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

	register(container: MainServiceContainer, eventBus: EventBus): void {
		const logger = container.get('logger');
		const store = container.get('store');
		const apps = container.get('apps');
		const userDataDirectory = container.get('userDataDirectory');

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
		ipcMain.on(AppChannels.setTheme, (event, theme: string) => {
			if (!isThemeMode(theme)) return;
			if (this.lastTheme === theme) return;
			this.lastTheme = theme;

			nativeTheme.themeSource = theme;
			eventBus.emit('theme:changed', { theme });

			const senderContents = event.sender;
			BrowserWindow.getAllWindows().forEach((win) => {
				if (!win.isDestroyed() && win.webContents !== senderContents) {
					win.webContents.send(AppChannels.themeChanged, theme);
				}
			});
		});

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
					await openPathOrThrow(logsDir);
				}
			}, AppChannels.openLogsFolder)
		);

		// Open application data folder in system file explorer
		ipcMain.handle(
			AppChannels.openAppDataFolder,
			wrapSimpleHandler(async () => {
				await openPathOrThrow(app.getPath('userData'));
			}, AppChannels.openAppDataFolder)
		);

		ipcMain.handle(
			AppChannels.openUserDataFolder,
			wrapSimpleHandler(async () => {
				const target = await userDataDirectory.ensureRoot();
				await openPathOrThrow(target);
			}, AppChannels.openUserDataFolder)
		);

		ipcMain.handle(
			AppChannels.openExternalUrl,
			wrapSimpleHandler(async (url: string) => {
				const externalUrl = normalizeExternalUrl(url);
				if (!externalUrl) {
					throw new Error('External URL must use HTTP or HTTPS.');
				}
				await shell.openExternal(externalUrl);
			}, AppChannels.openExternalUrl)
		);

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

		ipcMain.handle(
			AppChannels.getMicrophonePermission,
			wrapSimpleHandler(() => {
				return microphoneSettings(store.getMicrophoneEnabled());
			}, AppChannels.getMicrophonePermission)
		);

		ipcMain.handle(
			AppChannels.setMicrophoneEnabled,
			wrapSimpleHandler((enabled: boolean) => {
				const next = store.setMicrophoneEnabled(Boolean(enabled));
				return microphoneSettings(next.microphoneEnabled);
			}, AppChannels.setMicrophoneEnabled)
		);

		ipcMain.handle(
			AppChannels.requestMicrophonePermission,
			wrapSimpleHandler(async () => {
				const enabled = store.getMicrophoneEnabled();
				if (process.platform === 'darwin' && enabled) {
					await systemPreferences.askForMediaAccess('microphone');
				}
				return microphoneSettings(enabled);
			}, AppChannels.requestMicrophonePermission)
		);

		ipcMain.handle(
			ProviderChannels.setApiKey,
			wrapSimpleHandler((providerId: string, apiKey: string) => {
				const normalizedProviderId = providerId.trim().toLowerCase();
				const trimmedApiKey = apiKey.trim();

				if (!trimmedApiKey) {
					throw new Error('API key is required.');
				}

				const defaultProvider = DEFAULT_PROVIDERS.find(
					(p) => p.id.trim().toLowerCase() === normalizedProviderId
				);
				if (!defaultProvider) {
					throw new Error(`Unknown provider: ${providerId}`);
				}

				store.upsertProvider({ ...defaultProvider, apiKey: trimmedApiKey });
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
				(): PublicProvider[] => store.getProviders().map(({ apiKey: _apiKey, ...rest }) => rest),
				ProviderChannels.getAll
			)
		);

		ipcMain.handle(
			ProviderChannels.add,
			wrapSimpleHandler((input: ProviderInput): PublicProvider => {
				const id = input.id.trim().toLowerCase();
				const name = input.name.trim();
				const baseUrl = input.baseUrl.trim();
				const apiKey = input.apiKey.trim();

				if (!id) {
					throw new Error('Provider id is required.');
				}

				if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
					throw new Error('Provider id can contain only lowercase letters, numbers, and hyphens.');
				}

				if (!name) {
					throw new Error('Provider name is required.');
				}

				if (!baseUrl) {
					throw new Error('Base URL is required.');
				}

				let url: URL;
				try {
					url = new URL(baseUrl);
				} catch {
					throw new Error('Base URL must be a valid HTTPS URL.');
				}

				if (url.protocol !== 'https:') {
					throw new Error('Base URL must use HTTPS.');
				}

				if (!apiKey) {
					throw new Error('API key is required.');
				}

				const { apiKey: _apiKey, ...provider } = store.addProvider({
					id,
					name,
					baseUrl,
					apiKey,
				});
				return provider;
			}, ProviderChannels.add)
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
					return filterSelectableAgentModels(storedProvider.id, await getOpenAiModels(apiKey));
				}

				if (normalizedProviderId === 'anthropic') {
					return filterSelectableAgentModels(storedProvider.id, await getAnthropicModels(apiKey));
				}

				throw new Error(`Unsupported provider id: ${storedProvider.id}`);
			}, ProviderChannels.getModels)
		);

		ipcMain.handle(
			ProviderChannels.getAgentService,
			wrapSimpleHandler((): Agent | undefined => {
				return store.getAgentService();
			}, ProviderChannels.getAgentService)
		);

		ipcMain.handle(
			ProviderChannels.saveAgentService,
			wrapSimpleHandler((provider: PublicProvider, model: Model) => {
				if (!isAllowedAgentModel(provider.id, model.id)) {
					throw new Error(`Model is not supported for agent tool use: ${model.id}`);
				}
				const normalizedProviderId = provider.id.trim().toLowerCase();
				if (
					normalizedProviderId === 'openai' &&
					model.effort !== undefined &&
					!isModelReasoningEffort(model.effort)
				) {
					throw new Error(`Reasoning effort is not supported: ${model.effort}`);
				}
				const modelToSave = normalizedProviderId === 'openai'
					? { ...model, effort: normalizeModelReasoningEffort(model.id, model.effort) }
					: { id: model.id, name: model.name };
				return store.setAgentService(provider.id, modelToSave);
			}, ProviderChannels.saveAgentService)
		);

		ipcMain.handle(
			ProviderChannels.getSpeechTranscriberService,
			wrapSimpleHandler((): Agent | undefined => {
				return store.getSpeechTranscriberService();
			}, ProviderChannels.getSpeechTranscriberService)
		);

		ipcMain.handle(
			ProviderChannels.saveSpeechTranscriberService,
			wrapSimpleHandler((provider: PublicProvider, model: Model) => {
				const normalizedProviderId = provider.id.trim().toLowerCase();
				if (normalizedProviderId !== SPEECH_TRANSCRIBER_PROVIDER_ID) {
					throw new Error('Speech transcription currently supports OpenAI only.');
				}
				if (!SPEECH_TRANSCRIBER_MODELS.some((option) => option.id === model.id)) {
					throw new Error(`Model is not supported for speech transcription: ${model.id}`);
				}
				return store.setSpeechTranscriberService(provider.id, { id: model.id, name: model.name });
			}, ProviderChannels.saveSpeechTranscriberService)
		);

		ipcMain.handle(
			AppsChannels.list,
			wrapSimpleHandler(() => apps.list(), AppsChannels.list)
		);

		ipcMain.handle(
			AppsChannels.openFolder,
			wrapSimpleHandler((id: string) => apps.openFolder(id), AppsChannels.openFolder)
		);

		ipcMain.handle(
			AppsChannels.delete,
			wrapSimpleHandler((id: string) => apps.delete(id), AppsChannels.delete)
		);

		ipcMain.handle(
			AppsChannels.getRoot,
			wrapSimpleHandler(() => apps.getAppsRoot(), AppsChannels.getRoot)
		);

		logger.info('AppIpc', `Registered ${this.name} module`);
	}
}
