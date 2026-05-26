import { ipcMain } from 'electron';
import {
	getMusicCreatorModels,
	getSpeechToTextModels,
	getTextToSpeechModels,
	getTextToVideoModels,
	isAllowedImageCreatorModelForProvider,
	isAllowedMusicCreatorModel,
	isAllowedSpeechToTextModel,
	isAllowedTextToSpeechModel,
	isAllowedTextToVideoModel,
	requireModelReasoningEffort,
	supportsModelReasoningEffortProvider,
	type Agent,
	type ConfiguredModelOperator,
	type Model,
} from '../../shared/agents/service';
import { isAllowedAgentModel } from '../../shared/agents/models';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import { wrapSimpleHandler } from './ipc-error-handler';
import { StoreChannels } from '../../shared/ipc-channels';
import {
	DEFAULT_PROVIDERS,
	type Provider,
	type ProviderInput,
	type PublicProvider,
} from '../../shared/providers';
import type { StoreService } from '../store';

function publicProvider(provider: Provider): PublicProvider {
	const { apiKey: _apiKey, ...rest } = provider;
	return rest;
}

function getStoredProvider(store: StoreService, provider: PublicProvider): Provider {
	const storedProvider = store.getProviderById(provider.id);
	if (!storedProvider) {
		throw new Error(`Provider not found: ${provider.id}`);
	}
	return storedProvider;
}

function setProviderApiKey(store: StoreService, providerId: string, apiKey: string): void {
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
}

function addProvider(store: StoreService, input: ProviderInput): PublicProvider {
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

	return publicProvider(store.addProvider({ id, name, baseUrl, apiKey }));
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

function speechToTextModelOrThrow(providerId: string, model: Model): Model {
	return catalogModelOrThrow(
		providerId,
		model,
		getSpeechToTextModels,
		isAllowedSpeechToTextModel,
		'speech-to-text'
	);
}

function agentModelOrThrow(providerId: string, model: Model): Model {
	if (!isAllowedAgentModel(providerId, model.id)) {
		throw new Error(`Model is not supported for agent tool use: ${model.id}`);
	}
	const normalizedProviderId = providerId.trim().toLowerCase();
	return supportsModelReasoningEffortProvider(normalizedProviderId)
		? {
				...model,
				effort: requireModelReasoningEffort(model.id, model.effort, normalizedProviderId),
			}
		: { id: model.id, name: model.name };
}

export class StoreIpc implements IpcModule {
	readonly name = 'store';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const store = container.get('store');
		const connectors = container.get('connectors');
		const logger = container.get('logger');
		const powerSaveBlocker = container.get('powerSaveBlocker');

		ipcMain.handle(
			StoreChannels.getProviders,
			wrapSimpleHandler((): PublicProvider[] => {
				return store.getProviders().map(publicProvider);
			}, StoreChannels.getProviders)
		);

		ipcMain.handle(
			StoreChannels.setProviderApiKey,
			wrapSimpleHandler((providerId: string, apiKey: string): void => {
				setProviderApiKey(store, providerId, apiKey);
			}, StoreChannels.setProviderApiKey)
		);

		ipcMain.handle(
			StoreChannels.isProviderApiKeySaved,
			wrapSimpleHandler((providerId: string): boolean => {
				const normalizedProviderId = providerId.trim().toLowerCase();
				const provider = store
					.getProviders()
					.find((item) => item.id.trim().toLowerCase() === normalizedProviderId);

				return (provider?.apiKey.trim().length ?? 0) > 0;
			}, StoreChannels.isProviderApiKeySaved)
		);

		ipcMain.handle(
			StoreChannels.addProvider,
			wrapSimpleHandler((input: ProviderInput): PublicProvider => {
				return addProvider(store, input);
			}, StoreChannels.addProvider)
		);

		ipcMain.handle(
			StoreChannels.getKeepAwakeEnabled,
			wrapSimpleHandler(
				(): boolean => store.getKeepAwakeEnabled(),
				StoreChannels.getKeepAwakeEnabled
			)
		);

		ipcMain.handle(
			StoreChannels.setKeepAwakeEnabled,
			wrapSimpleHandler((enabled: boolean): boolean => {
				const nextEnabled = powerSaveBlocker.setEnabled(enabled);
				return store.setKeepAwakeEnabled(nextEnabled).keepAwakeEnabled;
			}, StoreChannels.setKeepAwakeEnabled)
		);

		ipcMain.handle(
			StoreChannels.getAssistantSettings,
			wrapSimpleHandler((): ReturnType<typeof store.getAssistantSettings> => {
				return store.getAssistantSettings();
			}, StoreChannels.getAssistantSettings)
		);

		ipcMain.handle(
			StoreChannels.getSpeechToTextSettings,
			wrapSimpleHandler((): ReturnType<typeof store.getSpeechToTextSettings> => {
				return store.getSpeechToTextSettings();
			}, StoreChannels.getSpeechToTextSettings)
		);

		ipcMain.handle(
			StoreChannels.getTextToSpeechSettings,
			wrapSimpleHandler((): ReturnType<typeof store.getTextToSpeechSettings> => {
				return store.getTextToSpeechSettings();
			}, StoreChannels.getTextToSpeechSettings)
		);

		ipcMain.handle(
			StoreChannels.getImageCreatorSettings,
			wrapSimpleHandler((): ReturnType<typeof store.getImageCreatorSettings> => {
				return store.getImageCreatorSettings();
			}, StoreChannels.getImageCreatorSettings)
		);

		ipcMain.handle(
			StoreChannels.getTextToVideoSettings,
			wrapSimpleHandler((): ReturnType<typeof store.getTextToVideoSettings> => {
				return store.getTextToVideoSettings();
			}, StoreChannels.getTextToVideoSettings)
		);

		ipcMain.handle(
			StoreChannels.getTextToSoundSettings,
			wrapSimpleHandler((): ReturnType<typeof store.getTextToSoundSettings> => {
				return store.getTextToSoundSettings();
			}, StoreChannels.getTextToSoundSettings)
		);

		ipcMain.handle(
			StoreChannels.getCronSettings,
			wrapSimpleHandler((): ReturnType<typeof store.getCronSettings> => {
				return store.getCronSettings();
			}, StoreChannels.getCronSettings)
		);

		ipcMain.handle(
			StoreChannels.getTaskSettings,
			wrapSimpleHandler((): ReturnType<typeof store.getTaskSettings> => {
				return store.getTaskSettings();
			}, StoreChannels.getTaskSettings)
		);

		ipcMain.handle(
			StoreChannels.getAgentRoutingSettings,
			wrapSimpleHandler((): ReturnType<typeof store.getAgentRoutingSettings> => {
				return store.getAgentRoutingSettings();
			}, StoreChannels.getAgentRoutingSettings)
		);

		ipcMain.handle(
			StoreChannels.getConnectorSettings,
			wrapSimpleHandler((): ReturnType<typeof connectors.getConnectorSettings> => {
				return connectors.getConnectorSettings();
			}, StoreChannels.getConnectorSettings)
		);

		ipcMain.handle(
			StoreChannels.getAssistantOperator,
			wrapSimpleHandler(
				(): ConfiguredModelOperator | undefined => store.getAssistantOperator(),
				StoreChannels.getAssistantOperator
			)
		);

		ipcMain.handle(
			StoreChannels.saveAssistantOperator,
			wrapSimpleHandler((provider: PublicProvider, model: Model): boolean => {
				return store.setAssistantOperator(provider.id, agentModelOrThrow(provider.id, model));
			}, StoreChannels.saveAssistantOperator)
		);

		ipcMain.handle(
			StoreChannels.getSpeechToTextOperator,
			wrapSimpleHandler(
				(): ConfiguredModelOperator | undefined => store.getSpeechToTextOperator(),
				StoreChannels.getSpeechToTextOperator
			)
		);

		ipcMain.handle(
			StoreChannels.saveSpeechToTextOperator,
			wrapSimpleHandler((provider: PublicProvider, model: Model): boolean => {
				const storedProvider = getStoredProvider(store, provider);
				return store.setSpeechToTextOperator(
					storedProvider.id,
					speechToTextModelOrThrow(storedProvider.id, model)
				);
			}, StoreChannels.saveSpeechToTextOperator)
		);

		ipcMain.handle(
			StoreChannels.getTextToSpeechOperator,
			wrapSimpleHandler(
				(): ConfiguredModelOperator | undefined => store.getTextToSpeechOperator(),
				StoreChannels.getTextToSpeechOperator
			)
		);

		ipcMain.handle(
			StoreChannels.saveTextToSpeechOperator,
			wrapSimpleHandler((provider: PublicProvider, model: Model): boolean => {
				const storedProvider = getStoredProvider(store, provider);
				return store.setTextToSpeechOperator(
					storedProvider.id,
					catalogModelOrThrow(
						storedProvider.id,
						model,
						getTextToSpeechModels,
						isAllowedTextToSpeechModel,
						'text-to-speech work'
					)
				);
			}, StoreChannels.saveTextToSpeechOperator)
		);

		ipcMain.handle(
			StoreChannels.getImageCreatorOperator,
			wrapSimpleHandler(
				(): ConfiguredModelOperator | undefined => store.getImageCreatorOperator(),
				StoreChannels.getImageCreatorOperator
			)
		);

		ipcMain.handle(
			StoreChannels.saveImageCreatorOperator,
			wrapSimpleHandler((provider: PublicProvider, model: Model): boolean => {
				const storedProvider = getStoredProvider(store, provider);
				if (!isAllowedImageCreatorModelForProvider(storedProvider, model.id)) {
					throw new Error(`Model is not supported for text-to-image work: ${model.id}`);
				}
				return store.setImageCreatorOperator(storedProvider.id, {
					id: model.id,
					name: model.name,
				});
			}, StoreChannels.saveImageCreatorOperator)
		);

		ipcMain.handle(
			StoreChannels.getTextToVideoOperator,
			wrapSimpleHandler(
				(): ConfiguredModelOperator | undefined => store.getTextToVideoOperator(),
				StoreChannels.getTextToVideoOperator
			)
		);

		ipcMain.handle(
			StoreChannels.saveTextToVideoOperator,
			wrapSimpleHandler((provider: PublicProvider, model: Model): boolean => {
				const storedProvider = getStoredProvider(store, provider);
				return store.setTextToVideoOperator(
					storedProvider.id,
					catalogModelOrThrow(
						storedProvider.id,
						model,
						getTextToVideoModels,
						isAllowedTextToVideoModel,
						'text-to-video work'
					)
				);
			}, StoreChannels.saveTextToVideoOperator)
		);

		ipcMain.handle(
			StoreChannels.getMusicCreatorOperator,
			wrapSimpleHandler(
				(): ConfiguredModelOperator | undefined => store.getMusicCreatorOperator(),
				StoreChannels.getMusicCreatorOperator
			)
		);

		ipcMain.handle(
			StoreChannels.saveMusicCreatorOperator,
			wrapSimpleHandler((provider: PublicProvider, model: Model): boolean => {
				const storedProvider = getStoredProvider(store, provider);
				return store.setMusicCreatorOperator(
					storedProvider.id,
					catalogModelOrThrow(
						storedProvider.id,
						model,
						getMusicCreatorModels,
						isAllowedMusicCreatorModel,
						'music creation work'
					)
				);
			}, StoreChannels.saveMusicCreatorOperator)
		);

		ipcMain.handle(
			StoreChannels.getAgentService,
			wrapSimpleHandler(
				(): Agent | undefined => store.getAgentService(),
				StoreChannels.getAgentService
			)
		);

		ipcMain.handle(
			StoreChannels.saveAgentService,
			wrapSimpleHandler((provider: PublicProvider, model: Model): boolean => {
				return store.setAgentService(provider.id, agentModelOrThrow(provider.id, model));
			}, StoreChannels.saveAgentService)
		);

		ipcMain.handle(
			StoreChannels.getSpeechTranscriberService,
			wrapSimpleHandler(
				(): Agent | undefined => store.getSpeechTranscriberService(),
				StoreChannels.getSpeechTranscriberService
			)
		);

		ipcMain.handle(
			StoreChannels.saveSpeechTranscriberService,
			wrapSimpleHandler((provider: PublicProvider, model: Model): boolean => {
				const storedProvider = getStoredProvider(store, provider);
				return store.setSpeechTranscriberService(
					storedProvider.id,
					speechToTextModelOrThrow(storedProvider.id, model)
				);
			}, StoreChannels.saveSpeechTranscriberService)
		);

		logger.info('StoreIpc', `Registered ${this.name} module`);
	}
}
