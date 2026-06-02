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
	type ModelSelection,
	type Model,
} from '../../shared/agents/service';
import { isAllowedAgentModel } from '../../shared/agents/models';
import type { IpcModule } from './module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { wrapSimpleHandler } from './errorHandler';
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
		const agentSettings = container.get('agentSettings');
		const connectors = container.get('connectors');
		const logger = container.get('logger');

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
			wrapSimpleHandler((): ReturnType<typeof agentSettings.getAgentRoutingSettings> => {
				return agentSettings.getAgentRoutingSettings();
			}, StoreChannels.getAgentRoutingSettings)
		);

		ipcMain.handle(
			StoreChannels.getConnectorSettings,
			wrapSimpleHandler((): ReturnType<typeof connectors.getConnectorSettings> => {
				return connectors.getConnectorSettings();
			}, StoreChannels.getConnectorSettings)
		);

		ipcMain.handle(
			StoreChannels.getAgentService,
			wrapSimpleHandler(
				(): ModelSelection | undefined => store.getAgentService(),
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
				(): ModelSelection | undefined => store.getSpeechTranscriberService(),
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

		ipcMain.handle(
			StoreChannels.getTextToSpeechService,
			wrapSimpleHandler(
				(): ModelSelection | undefined => store.getTextToSpeechService(),
				StoreChannels.getTextToSpeechService
			)
		);

		ipcMain.handle(
			StoreChannels.saveTextToSpeechService,
			wrapSimpleHandler((provider: PublicProvider, model: Model): boolean => {
				const storedProvider = getStoredProvider(store, provider);
				return store.setTextToSpeechService(
					storedProvider.id,
					catalogModelOrThrow(
						storedProvider.id,
						model,
						getTextToSpeechModels,
						isAllowedTextToSpeechModel,
						'text-to-speech work'
					)
				);
			}, StoreChannels.saveTextToSpeechService)
		);

		ipcMain.handle(
			StoreChannels.getImageCreatorService,
			wrapSimpleHandler(
				(): ModelSelection | undefined => store.getImageCreatorService(),
				StoreChannels.getImageCreatorService
			)
		);

		ipcMain.handle(
			StoreChannels.saveImageCreatorService,
			wrapSimpleHandler((provider: PublicProvider, model: Model): boolean => {
				const storedProvider = getStoredProvider(store, provider);
				if (!isAllowedImageCreatorModelForProvider(storedProvider, model.id)) {
					throw new Error(`Model is not supported for text-to-image work: ${model.id}`);
				}
				return store.setImageCreatorService(storedProvider.id, {
					id: model.id,
					name: model.name,
				});
			}, StoreChannels.saveImageCreatorService)
		);

		ipcMain.handle(
			StoreChannels.getTextToVideoService,
			wrapSimpleHandler(
				(): ModelSelection | undefined => store.getTextToVideoService(),
				StoreChannels.getTextToVideoService
			)
		);

		ipcMain.handle(
			StoreChannels.saveTextToVideoService,
			wrapSimpleHandler((provider: PublicProvider, model: Model): boolean => {
				const storedProvider = getStoredProvider(store, provider);
				return store.setTextToVideoService(
					storedProvider.id,
					catalogModelOrThrow(
						storedProvider.id,
						model,
						getTextToVideoModels,
						isAllowedTextToVideoModel,
						'text-to-video work'
					)
				);
			}, StoreChannels.saveTextToVideoService)
		);

		ipcMain.handle(
			StoreChannels.getTextToSoundService,
			wrapSimpleHandler(
				(): ModelSelection | undefined => store.getTextToSoundService(),
				StoreChannels.getTextToSoundService
			)
		);

		ipcMain.handle(
			StoreChannels.saveTextToSoundService,
			wrapSimpleHandler((provider: PublicProvider, model: Model): boolean => {
				const storedProvider = getStoredProvider(store, provider);
				return store.setTextToSoundService(
					storedProvider.id,
					catalogModelOrThrow(
						storedProvider.id,
						model,
						getMusicCreatorModels,
						isAllowedMusicCreatorModel,
						'music creation work'
					)
				);
			}, StoreChannels.saveTextToSoundService)
		);

		logger.info('StoreIpc', `Registered ${this.name} module`);
	}
}
