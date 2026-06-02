import { app, ipcMain, BrowserWindow, shell, systemPreferences } from 'electron';
import type { IpcModule } from './module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import {
	getSpeechToTextModels,
	getImageCreatorModelsForProvider,
	getMusicCreatorModels,
	getTextToSpeechModels,
	getTextToVideoModels,
	isAllowedSpeechToTextModel,
	requireModelReasoningEffort,
	supportsModelReasoningEffortProvider,
	type ModelSelection,
	type Model,
} from '../../shared/agents/service';
import type {
	MicrophonePermissionSettings,
	MicrophoneSystemPermissionStatus,
	CameraPermissionSettings,
	CameraSystemPermissionStatus,
	SystemPreferencePaneId,
} from '../../shared/app-permissions';
import { DEFAULT_PROVIDERS, type ProviderInput, type PublicProvider } from '../../shared/providers';
import {
	getDefaultAgentModels,
	hasDefaultAgentModels,
	isAllowedAgentModel,
} from '../../shared/agents/models';
import { wrapSimpleHandler } from './errorHandler';
import { AppChannels, ProviderChannels } from '../../shared/ipc-channels';

const SYSTEM_PREFERENCE_PANES: Record<SystemPreferencePaneId, string> = {
	Accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
	ScreenCapture: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
	Camera: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera',
	Microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
};
import { normalizeExternalUrl } from '../../shared/external-links';

const VALID_LANGUAGES = ['en', 'it'] as const;

function speechToTextModelOrThrow(providerId: string, model: Model): Model {
	return catalogModelOrThrow(
		providerId,
		model,
		getSpeechToTextModels,
		isAllowedSpeechToTextModel,
		'speech-to-text'
	);
}

function catalogModelOrThrow(
	providerId: string,
	model: Model,
	getModelsForProvider: (providerId: string) => Model[],
	isAllowedModel: (providerId: string, modelId: string) => boolean,
	label: string
): Model {
	if (!isAllowedModel(providerId, model.id)) {
		throw new Error(`Model is not supported for ${label}: ${model.id}`);
	}
	const catalogModel = getModelsForProvider(providerId).find((option) => option.id === model.id);
	return {
		id: catalogModel?.id ?? model.id,
		name: catalogModel?.name ?? model.name,
	};
}

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

function getCameraSystemStatus(): CameraSystemPermissionStatus {
	if (process.platform !== 'darwin') return 'unknown';
	try {
		return systemPreferences.getMediaAccessStatus('camera');
	} catch {
		return 'unknown';
	}
}

function canRequestCameraAccess(status: CameraSystemPermissionStatus): boolean {
	return process.platform === 'darwin' && status === 'not-determined';
}

function cameraSettings(enabled: boolean): CameraPermissionSettings {
	const systemStatus = getCameraSystemStatus();
	return {
		enabled,
		systemStatus,
		canRequest: canRequestCameraAccess(systemStatus),
	};
}

async function openPathOrThrow(target: string): Promise<void> {
	const error = await shell.openPath(target);
	if (error) {
		throw new Error(error);
	}
}

export class AppIpc implements IpcModule {
	readonly name = 'app';

	private lastLanguage: string | null = null;
	private trayEnabled = true;

	register(container: MainServiceContainer, eventBus: EventBus): void {
			const logger = container.get('logger');
			const store = container.get('store');
			const appPermissions = container.get('appPermissions');

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
				return microphoneSettings(appPermissions.getMicrophoneEnabled());
			}, AppChannels.getMicrophonePermission)
		);

		ipcMain.handle(
			AppChannels.setMicrophoneEnabled,
			wrapSimpleHandler((enabled: boolean) => {
				const next = appPermissions.setMicrophoneEnabled(Boolean(enabled));
				return microphoneSettings(next.microphoneEnabled);
			}, AppChannels.setMicrophoneEnabled)
		);

		ipcMain.handle(
			AppChannels.requestMicrophonePermission,
			wrapSimpleHandler(async () => {
				const enabled = appPermissions.getMicrophoneEnabled();
				if (process.platform === 'darwin' && enabled) {
					await systemPreferences.askForMediaAccess('microphone');
				}
				return microphoneSettings(enabled);
			}, AppChannels.requestMicrophonePermission)
		);

		ipcMain.handle(
			AppChannels.openSystemPreference,
			wrapSimpleHandler(async (pane: SystemPreferencePaneId) => {
				const url = SYSTEM_PREFERENCE_PANES[pane];
				if (!url) {
					throw new Error(`Unknown system preference pane: ${pane}`);
				}
				await shell.openExternal(url);
			}, AppChannels.openSystemPreference)
		);

		ipcMain.handle(
			AppChannels.getCameraPermission,
			wrapSimpleHandler(() => {
				return cameraSettings(appPermissions.getCameraEnabled());
			}, AppChannels.getCameraPermission)
		);

		ipcMain.handle(
			AppChannels.setCameraEnabled,
			wrapSimpleHandler((enabled: boolean) => {
				const next = appPermissions.setCameraEnabled(Boolean(enabled));
				return cameraSettings(next.cameraEnabled);
			}, AppChannels.setCameraEnabled)
		);

		ipcMain.handle(
			AppChannels.requestCameraPermission,
			wrapSimpleHandler(async () => {
				const enabled = appPermissions.getCameraEnabled();
				if (process.platform === 'darwin' && enabled) {
					await systemPreferences.askForMediaAccess('camera');
				}
				return cameraSettings(enabled);
			}, AppChannels.requestCameraPermission)
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

				if (hasDefaultAgentModels(normalizedProviderId)) {
					return getDefaultAgentModels(normalizedProviderId);
				}

				const isKnownProvider = DEFAULT_PROVIDERS.some(
					(defaultProvider) => defaultProvider.id.trim().toLowerCase() === normalizedProviderId
				);
				if (isKnownProvider) {
					return [];
				}

				throw new Error(`Unsupported provider id: ${storedProvider.id}`);
			}, ProviderChannels.getModels)
		);

		ipcMain.handle(
			ProviderChannels.getSpeechToTextModels,
			wrapSimpleHandler((provider: PublicProvider): Model[] => {
				const storedProvider = store.getProviderById(provider.id);
				if (!storedProvider) {
					throw new Error(`Provider not found: ${provider.id}`);
				}
				return getSpeechToTextModels(storedProvider.id);
			}, ProviderChannels.getSpeechToTextModels)
		);

		ipcMain.handle(
			ProviderChannels.getTextToSpeechModels,
			wrapSimpleHandler((provider: PublicProvider): Model[] => {
				const storedProvider = store.getProviderById(provider.id);
				if (!storedProvider) {
					throw new Error(`Provider not found: ${provider.id}`);
				}
				return getTextToSpeechModels(storedProvider.id);
			}, ProviderChannels.getTextToSpeechModels)
		);

		ipcMain.handle(
			ProviderChannels.getImageCreatorModels,
			wrapSimpleHandler((provider: PublicProvider): Model[] => {
				const storedProvider = store.getProviderById(provider.id);
				if (!storedProvider) {
					throw new Error(`Provider not found: ${provider.id}`);
				}
				return getImageCreatorModelsForProvider(storedProvider);
			}, ProviderChannels.getImageCreatorModels)
		);

		ipcMain.handle(
			ProviderChannels.getTextToVideoModels,
			wrapSimpleHandler((provider: PublicProvider): Model[] => {
				const storedProvider = store.getProviderById(provider.id);
				if (!storedProvider) {
					throw new Error(`Provider not found: ${provider.id}`);
				}
				return getTextToVideoModels(storedProvider.id);
			}, ProviderChannels.getTextToVideoModels)
		);

		ipcMain.handle(
			ProviderChannels.getTextToSoundModels,
			wrapSimpleHandler((provider: PublicProvider): Model[] => {
				const storedProvider = store.getProviderById(provider.id);
				if (!storedProvider) {
					throw new Error(`Provider not found: ${provider.id}`);
				}
				return getMusicCreatorModels(storedProvider.id);
			}, ProviderChannels.getTextToSoundModels)
		);

		ipcMain.handle(
			ProviderChannels.getAgentService,
			wrapSimpleHandler((): ModelSelection | undefined => {
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
				const modelToSave = supportsModelReasoningEffortProvider(normalizedProviderId)
					? {
							...model,
							effort: requireModelReasoningEffort(model.id, model.effort, normalizedProviderId),
						}
					: { id: model.id, name: model.name };
				return store.setAgentService(provider.id, modelToSave);
			}, ProviderChannels.saveAgentService)
		);

		ipcMain.handle(
			ProviderChannels.getSpeechTranscriberService,
			wrapSimpleHandler((): ModelSelection | undefined => {
				return store.getSpeechTranscriberService();
			}, ProviderChannels.getSpeechTranscriberService)
		);

		ipcMain.handle(
			ProviderChannels.saveSpeechTranscriberService,
			wrapSimpleHandler((provider: PublicProvider, model: Model) => {
				const storedProvider = store.getProviderById(provider.id);
				if (!storedProvider) {
					throw new Error(`Provider not found: ${provider.id}`);
				}
				return store.setSpeechTranscriberService(
					storedProvider.id,
					speechToTextModelOrThrow(storedProvider.id, model)
				);
			}, ProviderChannels.saveSpeechTranscriberService)
		);

		logger.info('AppIpc', `Registered ${this.name} module`);
	}
}
