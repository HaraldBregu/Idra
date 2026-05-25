import { getDefaultAgentModels, isAllowedAgentModel } from '../../shared/agents/models';
import {
	OPERATOR_DEFINITIONS,
	getImageCreatorModels,
	getImageCreatorModelsForProvider,
	getSpeechToTextModels,
	isAllowedSpeechToTextModel,
	isAllowedImageCreatorModelForProvider,
	isAllowedMusicCreatorModel,
	isAllowedTextToSpeechModel,
	isAllowedTextToVideoModel,
	isModelReasoningEffort,
	type ConfiguredModelOperator,
	type Model,
	type ModelOperatorSelection,
	type OperatorStoreState,
} from '../../shared/agents/service';
import type { Provider } from '../../shared/providers';
import {
	getMusicModelsByProvider,
	getTextToSpeechModelsByProvider,
	getTextToVideoModelsByProvider,
} from '../../shared/providers';
import type { AgentHeartbeatConfig, AgentsHeartbeatConfig } from '../../shared/heartbeat';
import type {
	AgentModuleOptions,
	ModelModuleSettings,
	SettingsStoreAccessor,
} from '../../shared/store';
import type { ProviderStore } from './provider';

type ConfiguredModelOperatorKey =
	| 'assistant'
	| 'speechToText'
	| 'textToSpeech'
	| 'imageCreator'
	| 'textToVideo'
	| 'textToSound';

type ModelModuleRootKey =
	| 'assistant'
	| 'speechToText'
	| 'textToSpeech'
	| 'imageCreator'
	| 'textToVideo'
	| 'textToSound';

type OperatorDefinitionKey =
	| 'assistant'
	| 'speechToText'
	| 'textToSpeech'
	| 'imageCreator'
	| 'videoCreator'
	| 'musicCreator';

const MODEL_MODULE_ROOT_KEYS = {
	assistant: 'assistant',
	speechToText: 'speechToText',
	textToSpeech: 'textToSpeech',
	imageCreator: 'imageCreator',
	textToVideo: 'textToVideo',
	textToSound: 'textToSound',
} satisfies Record<ConfiguredModelOperatorKey, ModelModuleRootKey>;

const OPERATOR_DEFINITION_KEYS = {
	assistant: 'assistant',
	speechToText: 'speechToText',
	textToSpeech: 'textToSpeech',
	imageCreator: 'imageCreator',
	textToVideo: 'videoCreator',
	textToSound: 'musicCreator',
} satisfies Record<ConfiguredModelOperatorKey, OperatorDefinitionKey>;

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
}

function publicProvider(provider: Provider): Omit<Provider, 'apiKey'> {
	const { apiKey: _apiKey, ...publicProvider } = provider;
	return publicProvider;
}

function readModelModuleSettings(value: unknown): ModelModuleSettings | undefined {
	const record = readRecord(value);
	if (!record) return undefined;
	const providerId =
		typeof record.providerId === 'string' ? record.providerId.trim().toLowerCase() : '';
	const modelId = typeof record.modelId === 'string' ? record.modelId.trim() : '';
	if (!providerId || !modelId) return undefined;
	const effort = isModelReasoningEffort(record.effort) ? record.effort : undefined;
	const options = readRecord(record.options);
	return {
		providerId,
		modelId,
		...(effort ? { effort } : {}),
		...(options ? { options } : {}),
	};
}

function readAgentModuleOptions(value: unknown): AgentModuleOptions {
	const options = readRecord(value);
	const next: AgentModuleOptions = options ? { ...options } : {};
	const runtime = normalizeAgentRuntime(next.agentRuntime);
	if (runtime === undefined) {
		delete next.agentRuntime;
	} else {
		next.agentRuntime = runtime;
	}
	return next;
}

function normalizeAgentRuntime(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function modelModuleSettings(
	providerId: string,
	model: Model,
	options?: Record<string, unknown>
): ModelModuleSettings {
	const next: ModelModuleSettings = {
		providerId: providerId.trim().toLowerCase(),
		modelId: model.id.trim(),
	};
	if (model.effort) next.effort = model.effort;
	if (options) next.options = options;
	return next;
}

function modelFromCatalog(catalog: readonly Model[], settings: ModelModuleSettings): Model {
	const model = catalog.find((entry) => entry.id === settings.modelId) ?? {
		id: settings.modelId,
		name: settings.modelId,
	};
	return {
		id: model.id,
		name: model.name,
		...(settings.effort ? { effort: settings.effort } : {}),
	};
}

function modelForModule(
	key: ConfiguredModelOperatorKey,
	settings: ModelModuleSettings,
	provider?: Provider
): Model {
	let catalog: readonly Model[];
	if (key === 'speechToText') {
		catalog = getSpeechToTextModels(settings.providerId);
	} else if (key === 'textToSpeech') {
		catalog = getTextToSpeechModelsByProvider(settings.providerId);
	} else if (key === 'imageCreator') {
		catalog = provider
			? getImageCreatorModelsForProvider(provider)
			: getImageCreatorModels(settings.providerId);
	} else if (key === 'textToVideo') {
		catalog = getTextToVideoModelsByProvider(settings.providerId);
	} else if (key === 'textToSound') {
		catalog = getMusicModelsByProvider(settings.providerId);
	} else {
		catalog = getDefaultAgentModels(settings.providerId);
	}
	return modelFromCatalog(catalog, settings);
}

function isAllowedModuleModel(
	key: ConfiguredModelOperatorKey,
	settings: ModelModuleSettings,
	provider: Provider
): boolean {
	if (key === 'speechToText') {
		return isAllowedSpeechToTextModel(provider.id, settings.modelId);
	}
	if (key === 'textToSpeech') {
		return isAllowedTextToSpeechModel(provider.id, settings.modelId);
	}
	if (key === 'imageCreator') {
		return isAllowedImageCreatorModelForProvider(provider, settings.modelId);
	}
	if (key === 'textToVideo') {
		return isAllowedTextToVideoModel(provider.id, settings.modelId);
	}
	if (key === 'textToSound') {
		return isAllowedMusicCreatorModel(provider.id, settings.modelId);
	}
	return isAllowedAgentModel(provider.id, settings.modelId);
}

function readAgentsHeartbeatConfig(
	settings: ModelModuleSettings | undefined
): AgentsHeartbeatConfig | undefined {
	const agents = readRecord(settings?.options?.agents);
	return agents as AgentsHeartbeatConfig | undefined;
}

function configuredModelOperator(
	key: ConfiguredModelOperatorKey,
	provider: Omit<Provider, 'apiKey'>,
	model: Model
): ConfiguredModelOperator {
	return {
		...OPERATOR_DEFINITIONS[OPERATOR_DEFINITION_KEYS[key]],
		provider,
		model,
	};
}

export class ModelStore {
	private store: SettingsStoreAccessor;
	private providers: ProviderStore;

	constructor(store: SettingsStoreAccessor, providers: ProviderStore) {
		this.store = store;
		this.providers = providers;
	}

	getOperator(): OperatorStoreState | undefined {
		const next: OperatorStoreState = {};
		const assistant = this.getConfiguredModelOperator('assistant');
		if (assistant) next.assistant = assistant;
		const speechToText = this.getConfiguredModelOperator('speechToText');
		if (speechToText) next.speechToText = speechToText;
		const textToSpeech = this.getConfiguredModelOperator('textToSpeech');
		if (textToSpeech) next.textToSpeech = textToSpeech;
		const imageCreator = this.getConfiguredModelOperator('imageCreator');
		if (imageCreator) next.imageCreator = imageCreator;
		const textToVideo = this.getConfiguredModelOperator('textToVideo');
		if (textToVideo) next.videoCreator = textToVideo;
		const textToSound = this.getConfiguredModelOperator('textToSound');
		if (textToSound) next.musicCreator = textToSound;
		const agentSettings = this.getModelModuleSettings('assistant');
		const agents = readAgentsHeartbeatConfig(agentSettings);
		if (agents) next.agents = agents;
		return Object.keys(next).length > 0 ? next : undefined;
	}

	getService(): OperatorStoreState | undefined {
		return this.getOperator();
	}

	setDefaultHeartbeatConfig(config: AgentHeartbeatConfig): AgentHeartbeatConfig {
		const currentAgentSettings = this.getModelModuleSettings('assistant');
		const currentAgents = readAgentsHeartbeatConfig(currentAgentSettings) ?? {};
		const currentDefaults = currentAgents.defaults ?? {};
		const currentHeartbeat = currentDefaults.heartbeat ?? {};
		const nextHeartbeat: AgentHeartbeatConfig = {
			...currentHeartbeat,
			...config,
		};
		if ('activeHours' in config && config.activeHours === undefined) {
			delete nextHeartbeat.activeHours;
		}
		const next: OperatorStoreState = {
			agents: {
				...currentAgents,
				defaults: {
					...currentDefaults,
					heartbeat: nextHeartbeat,
				},
			},
		};
		if (currentAgentSettings) {
			this.store.set('assistant', {
				...currentAgentSettings,
				options: {
					...(currentAgentSettings.options ?? {}),
					agents: next.agents,
				},
			});
		}
		return nextHeartbeat;
	}

	getAssistantOperator(): ConfiguredModelOperator | undefined {
		return this.getConfiguredModelOperator('assistant');
	}

	getAssistantModel(): Model | undefined {
		return this.getAssistantOperator()?.model;
	}

	getAssistantProvider(): Omit<Provider, 'apiKey'> | undefined {
		return this.getAssistantOperator()?.provider;
	}

	getSpeechToTextOperator(): ConfiguredModelOperator | undefined {
		return this.getConfiguredModelOperator('speechToText');
	}

	getTextToSpeechOperator(): ConfiguredModelOperator | undefined {
		return this.getConfiguredModelOperator('textToSpeech');
	}

	getImageCreatorOperator(): ConfiguredModelOperator | undefined {
		return this.getConfiguredModelOperator('imageCreator');
	}

	getTextToVideoOperator(): ConfiguredModelOperator | undefined {
		return this.getConfiguredModelOperator('textToVideo');
	}

	getMusicCreatorOperator(): ConfiguredModelOperator | undefined {
		return this.getConfiguredModelOperator('textToSound');
	}

	getImageCreatorSettings(): ModelModuleSettings | undefined {
		return this.getModelModuleSettings('imageCreator');
	}

	getAgentRuntimePreference(): string | undefined {
		const settings = this.getModelModuleSettings('assistant');
		return settings ? readAgentModuleOptions(settings.options)?.agentRuntime : undefined;
	}

	setAgentRuntimePreference(agentRuntime?: string): boolean {
		const runtime = normalizeAgentRuntime(agentRuntime);
		const settings = this.getModelModuleSettings('assistant');
		if (!settings) {
			return false;
		}
		const nextOptions = readAgentModuleOptions(settings.options);
		if (runtime === undefined) {
			delete nextOptions.agentRuntime;
		} else {
			nextOptions.agentRuntime = runtime;
		}
		const nextSettings: ModelModuleSettings = {
			...settings,
			options: nextOptions,
		};
		if (Object.keys(nextOptions).length === 0) delete nextSettings.options;
		this.store.set('assistant', nextSettings);
		return true;
	}

	setAssistantOperator(providerId: string, model: Model): boolean {
		const provider = this.providers.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		const current = this.getModelModuleSettings('assistant');
		const settings = modelModuleSettings(provider.id, model, current?.options);
		this.store.set('assistant', settings);
		return true;
	}

	setSpeechToTextOperator(providerId: string, model: Model): boolean {
		const provider = this.providers.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		if (!isAllowedSpeechToTextModel(provider.id, model.id)) {
			return false;
		}
		const current = this.getModelModuleSettings('speechToText');
		const catalogModel = getSpeechToTextModels(provider.id).find((entry) => entry.id === model.id);
		this.store.set(
			'speechToText',
			modelModuleSettings(provider.id, catalogModel ?? model, current?.options)
		);
		return true;
	}

	setTextToSpeechOperator(providerId: string, model: Model): boolean {
		const provider = this.providers.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		if (!isAllowedTextToSpeechModel(provider.id, model.id)) {
			return false;
		}
		const current = this.getModelModuleSettings('textToSpeech');
		const catalogModel = getTextToSpeechModelsByProvider(provider.id).find(
			(entry) => entry.id === model.id
		);
		this.store.set(
			'textToSpeech',
			modelModuleSettings(provider.id, catalogModel ?? model, current?.options)
		);
		return true;
	}

	setImageCreatorOperator(providerId: string, model: Model): boolean {
		const provider = this.providers.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		if (!isAllowedImageCreatorModelForProvider(provider, model.id)) {
			return false;
		}
		const catalogModel = getImageCreatorModelsForProvider(provider).find(
			(entry) => entry.id === model.id
		);
		this.store.set('imageCreator', modelModuleSettings(provider.id, catalogModel ?? model));
		return true;
	}

	setTextToVideoOperator(providerId: string, model: Model): boolean {
		const provider = this.providers.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		if (!isAllowedTextToVideoModel(provider.id, model.id)) {
			return false;
		}
		const current = this.getModelModuleSettings('textToVideo');
		const catalogModel = getTextToVideoModelsByProvider(provider.id).find(
			(entry) => entry.id === model.id
		);
		this.store.set(
			'textToVideo',
			modelModuleSettings(provider.id, catalogModel ?? model, current?.options)
		);
		return true;
	}

	setMusicCreatorOperator(providerId: string, model: Model): boolean {
		const provider = this.providers.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		if (!isAllowedMusicCreatorModel(provider.id, model.id)) {
			return false;
		}
		const current = this.getModelModuleSettings('textToSound');
		const catalogModel = getMusicModelsByProvider(provider.id).find(
			(entry) => entry.id === model.id
		);
		this.store.set(
			'textToSound',
			modelModuleSettings(provider.id, catalogModel ?? model, current?.options)
		);
		return true;
	}

	getAgentModel(): Model | undefined {
		return this.getAssistantModel();
	}

	getAgentProvider(): Omit<Provider, 'apiKey'> | undefined {
		return this.getAssistantProvider();
	}

	getAgentService(): ModelOperatorSelection | undefined {
		const operator = this.getAssistantOperator();
		return operator ? { provider: operator.provider, model: operator.model } : undefined;
	}

	getSpeechTranscriberService(): ModelOperatorSelection | undefined {
		const operator = this.getSpeechToTextOperator();
		return operator ? { provider: operator.provider, model: operator.model } : undefined;
	}

	setAgentService(providerId: string, model: Model): boolean {
		return this.setAssistantOperator(providerId, model);
	}

	setSpeechTranscriberService(providerId: string, model: Model): boolean {
		return this.setSpeechToTextOperator(providerId, model);
	}

	private getConfiguredModelOperator(
		key: ConfiguredModelOperatorKey
	): ConfiguredModelOperator | undefined {
		const rootKey = MODEL_MODULE_ROOT_KEYS[key];
		const settings = this.getModelModuleSettings(rootKey);
		if (settings) {
			const provider = this.providers.getProviderById(settings.providerId);
			if (provider) {
				if (!isAllowedModuleModel(key, settings, provider)) return undefined;
				return configuredModelOperator(
					key,
					publicProvider(provider),
					modelForModule(key, settings, provider)
				);
			}
		}
		return undefined;
	}

	private getModelModuleSettings(rootKey: ModelModuleRootKey): ModelModuleSettings | undefined {
		const value = this.store.get(rootKey);
		if (value !== undefined) return readModelModuleSettings(value);
		if (rootKey === 'assistant') return readModelModuleSettings(this.store.get('llmAgent'));
		return undefined;
	}
}
