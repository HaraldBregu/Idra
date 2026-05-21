import Store from 'electron-store';
import { DEFAULT_PROVIDERS, getDefaultAgentModels, type Provider } from '../../shared/providers';
import {
	DOCUMENT_READER_OCR_MODELS,
	MUSIC_CREATOR_MODELS,
	OPERATOR_DEFINITIONS,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_VIDEO_MODELS,
	getImageCreatorModels,
	getImageCreatorModelsForProvider,
	getSpeechToTextModels,
	isAllowedImageCreatorModelForProvider,
	isModelReasoningEffort,
	type ConfiguredModelOperator,
	type Model,
	type ModelOperatorSelection,
	type OperatorStoreState,
} from '../../shared/service';
import type { CronTask } from '../../shared/cron';
import {
	CHANNEL_PROVIDER_IDS,
	type Channel,
	type ChannelAccountProperties,
	type ChannelType,
	type GenericChannelProperties,
	type TelegramChannelProperties,
} from '../../shared/channels';
import type { ConnectorConfig } from '../../shared/connectors';
import type {
	BackgroundTaskSettings,
	ModelProviderSettings,
	ModelModuleSettings,
	OcrModuleSettings,
	SettingsStoreAccessor,
	StoreSchema,
	TaskSchedulerSettings,
} from './types';
import type { CronStoreState } from '../cron/core/cron.types';
import { emptyCronStoreState, migrateCronStoreState } from '../cron/store/cron-store-migrations';
import type { FridayCronStoreState } from '../cron/friday/store';
import { emptyFridayCronStoreState, migrateFridayCronStoreState } from '../cron/friday/store';
import type {
	AgentHeartbeatConfig,
	AgentsHeartbeatConfig,
	HeartbeatStoreState,
} from '../../shared/heartbeat';
import type { AppPermissionSettings } from '../../shared/app-permissions';
import type { AppSettings } from '../../shared/app-settings';
import { emptyHeartbeatStoreState, migrateHeartbeatStoreState } from '../heartbeat/store';

const DEFAULT_APP_PERMISSIONS: AppPermissionSettings = {
	microphoneEnabled: true,
};

const DEFAULT_APP_SETTINGS: AppSettings = {
	keepAwakeEnabled: false,
};

type ConfiguredModelOperatorKey =
	| 'assistant'
	| 'speechToText'
	| 'textToSpeech'
	| 'imageCreator'
	| 'textToVideo'
	| 'textToSound';
type ModelModuleRootKey =
	| 'llmAgent'
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
	assistant: 'llmAgent',
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

function publicProvider(provider: Provider): Omit<Provider, 'apiKey'> {
	return {
		id: provider.id,
		name: provider.name,
		baseUrl: provider.baseUrl,
	};
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
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

function readOcrSettings(value: unknown): OcrModuleSettings | undefined {
	const record = readRecord(value);
	if (!record) return undefined;
	if (record.mode === 'endpoint') {
		const endpoint = typeof record.endpoint === 'string' ? record.endpoint.trim() : '';
		return endpoint ? { mode: 'endpoint', endpoint } : undefined;
	}
	if (record.mode === 'model') {
		const settings = readModelModuleSettings(record);
		return settings ? { mode: 'model', ...settings } : undefined;
	}
	return undefined;
}

function readBackgroundTaskSettings(value: unknown): BackgroundTaskSettings {
	const record = readRecord(value);
	if (!record) return {};
	const allowedTaskTypes = Array.isArray(record.allowedTaskTypes)
		? record.allowedTaskTypes.flatMap((item) =>
				typeof item === 'string' && item.trim() ? [item.trim()] : []
			)
		: undefined;
	const defaultConcurrency =
		typeof record.defaultConcurrency === 'number' &&
		Number.isInteger(record.defaultConcurrency) &&
		record.defaultConcurrency > 0
			? record.defaultConcurrency
			: undefined;
	return {
		...(allowedTaskTypes && allowedTaskTypes.length > 0 ? { allowedTaskTypes } : {}),
		...(defaultConcurrency ? { defaultConcurrency } : {}),
	};
}

function modelProviderSettings(provider: Provider): ModelProviderSettings {
	return {
		id: provider.id.trim().toLowerCase(),
		name: provider.name.trim(),
		baseUrl: provider.baseUrl.trim(),
		apiKey: provider.apiKey.trim(),
	};
}

function readModelProviderSettings(value: unknown): ModelProviderSettings | undefined {
	const record = readRecord(value);
	if (!record) return undefined;
	const id = typeof record.id === 'string' ? record.id.trim().toLowerCase() : '';
	const name = typeof record.name === 'string' ? record.name.trim() : '';
	const baseUrl = typeof record.baseUrl === 'string' ? record.baseUrl.trim() : '';
	const apiKey = typeof record.apiKey === 'string' ? record.apiKey.trim() : '';
	if (!id || !name || !baseUrl) return undefined;
	return { id, name, baseUrl, apiKey };
}

function readModelProviderSettingsList(value: unknown): ModelProviderSettings[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry) => {
		const provider = readModelProviderSettings(entry);
		return provider ? [provider] : [];
	});
}

function defaultProviderForId(id: string): Provider | undefined {
	const providerId = id.trim().toLowerCase();
	return DEFAULT_PROVIDERS.find((provider) => provider.id.trim().toLowerCase() === providerId);
}

function providerFromSettings(settings: ModelProviderSettings): Provider {
	return {
		...(defaultProviderForId(settings.id) ?? {}),
		...settings,
	};
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

function modelForModule(
	key: ConfiguredModelOperatorKey,
	settings: ModelModuleSettings,
	provider?: Provider
): Model {
	let catalog: readonly Model[];
	if (key === 'speechToText') {
		catalog = getSpeechToTextModels(settings.providerId);
	} else if (key === 'textToSpeech') {
		catalog = TEXT_TO_SPEECH_MODELS;
	} else if (key === 'imageCreator') {
		catalog = provider
			? getImageCreatorModelsForProvider(provider)
			: getImageCreatorModels(settings.providerId);
	} else if (key === 'textToVideo') {
		catalog = TEXT_TO_VIDEO_MODELS;
	} else if (key === 'textToSound') {
		catalog = MUSIC_CREATOR_MODELS;
	} else {
		catalog = getDefaultAgentModels(settings.providerId);
	}
	const model = catalog.find((entry) => entry.id === settings.modelId) ?? {
		id: settings.modelId,
		name: settings.modelId,
	};
	return {
		...model,
		...(settings.effort ? { effort: settings.effort } : {}),
	};
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

export class StoreService {
	private store: SettingsStoreAccessor;

	constructor() {
		this.store = new Store<StoreSchema>({
			name: 'settings',
			accessPropertiesByDotNotation: false,
		}) as unknown as SettingsStoreAccessor;
	}

	getProviderById(id: string): Provider | undefined {
		const providerId = id.trim().toLowerCase();
		return this.getStoredModelProviders().find(
			(provider) => provider.id.trim().toLowerCase() === providerId
		);
	}

	getProviders(): Provider[] {
		return this.getStoredModelProviders();
	}

	getAppPermissions(): AppPermissionSettings {
		return {
			...DEFAULT_APP_PERMISSIONS,
			...(this.store.get('appPermissions') ?? {}),
		};
	}

	getMicrophoneEnabled(): boolean {
		return this.getAppPermissions().microphoneEnabled;
	}

	getAppSettings(): AppSettings {
		return {
			...DEFAULT_APP_SETTINGS,
			...(this.store.get('appSettings') ?? {}),
		};
	}

	getKeepAwakeEnabled(): boolean {
		return this.getAppSettings().keepAwakeEnabled;
	}

	setKeepAwakeEnabled(enabled: boolean): AppSettings {
		const next = {
			...this.getAppSettings(),
			keepAwakeEnabled: enabled,
		};
		this.store.set('appSettings', next);
		return next;
	}

	setMicrophoneEnabled(enabled: boolean): AppPermissionSettings {
		const next = {
			...this.getAppPermissions(),
			microphoneEnabled: enabled,
		};
		this.store.set('appPermissions', next);
		return next;
	}

	addProvider(input: Provider): Provider {
		const id = input.id.trim().toLowerCase();
		const providers = this.getStoredModelProviders();
		const exists = providers.some((provider) => provider.id.trim().toLowerCase() === id);

		if (exists) {
			throw new Error(`Provider already exists: ${input.id}`);
		}

		const provider: Provider = {
			id,
			name: input.name.trim(),
			baseUrl: input.baseUrl.trim(),
			apiKey: input.apiKey.trim(),
		};

		this.setStoredModelProviders([...providers, provider]);
		return provider;
	}

	upsertProvider(input: Provider): void {
		const id = input.id.trim().toLowerCase();
		const providers = this.getStoredModelProviders();
		const index = providers.findIndex((p) => p.id.trim().toLowerCase() === id);
		const record: Provider = {
			id,
			name: input.name.trim(),
			baseUrl: input.baseUrl.trim(),
			apiKey: input.apiKey.trim(),
		};
		if (index !== -1) {
			providers[index] = record;
		} else {
			providers.push(record);
		}
		this.setStoredModelProviders(providers);
	}

	getOperator(): OperatorStoreState | undefined {
		const legacy = this.getLegacyOperator();
		const next: OperatorStoreState = {
			...(legacy ?? {}),
		};
		const assistant = this.getConfiguredModelOperator('assistant');
		if (assistant) next.assistant = assistant;
		const speechToText = this.getConfiguredModelOperator('speechToText');
		if (speechToText) next.speechToText = speechToText;
		const imageCreator = this.getConfiguredModelOperator('imageCreator');
		if (imageCreator) next.imageCreator = imageCreator;
		const ocr = readOcrSettings(this.store.get('ocr'));
		if (ocr?.mode === 'endpoint') {
			next.documentReaderOcr = {
				...OPERATOR_DEFINITIONS.documentReaderOcr,
				endpoint: ocr.endpoint,
			};
		} else if (ocr?.mode === 'model') {
			const provider = this.getProviderById(ocr.providerId);
			if (provider) {
				next.documentReaderOcr = {
					...OPERATOR_DEFINITIONS.documentReaderOcr,
					provider: publicProvider(provider),
					model: modelForModule('assistant', ocr),
				};
			}
		}
		const agentSettings = this.getModelModuleSettings('agent');
		const agents = readAgentsHeartbeatConfig(agentSettings);
		if (agents) next.agents = agents;
		return Object.keys(next).length > 0 ? next : undefined;
	}

	getService(): OperatorStoreState | undefined {
		return this.getOperator();
	}

	setDefaultHeartbeatConfig(config: AgentHeartbeatConfig): AgentHeartbeatConfig {
		const currentAgentSettings =
			this.getModelModuleSettings('agent') ?? this.getLegacyModelModuleSettings('assistant');
		const current = this.getLegacyOperator();
		const currentAgents = readAgentsHeartbeatConfig(currentAgentSettings) ?? current?.agents ?? {};
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
			...current,
			agents: {
				...currentAgents,
				defaults: {
					...currentDefaults,
					heartbeat: nextHeartbeat,
				},
			},
		};
			if (currentAgentSettings) {
				this.store.set('agent', {
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

	getImageCreatorOperator(): ConfiguredModelOperator | undefined {
		return this.getConfiguredModelOperator('imageCreator');
	}

	getImageCreatorSettings(): ModelModuleSettings | undefined {
		return this.getModelModuleSettings('imageCreator');
	}

	getBackgroundTaskSettings(): BackgroundTaskSettings {
		return readBackgroundTaskSettings(this.store.get('backgroundTask'));
	}

	getDocumentReaderOcrEndpoint(): string | undefined {
		const ocr = readOcrSettings(this.store.get('ocr'));
		if (ocr?.mode === 'endpoint') return ocr.endpoint;
		const documentReader = this.getLegacyOperator()?.documentReaderOcr;
		if (isEndpointOperator(documentReader)) {
			const endpoint = documentReader.endpoint.trim();
			if (endpoint) return endpoint;
		}
		const legacyEndpoint = this.getLegacyOperator()?.ocr?.trim();
		return legacyEndpoint || undefined;
	}

	setAssistantOperator(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		const current = this.getModelModuleSettings('agent');
		const settings = modelModuleSettings(provider.id, model, current?.options);
		this.store.set('agent', settings);
		return true;
	}

	setSpeechToTextOperator(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		const current = this.getModelModuleSettings('speechToText');
		this.store.set('speechToText', modelModuleSettings(provider.id, model, current?.options));
		return true;
	}

	setImageCreatorOperator(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
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

	setOpenAiApiKey(key: string): void {
		const providers = this.getStoredModelProviders();
		const openAiProviderIndex = providers.findIndex(
			(provider) => provider.id.trim().toLowerCase() === 'openai'
		);

		const newProvider: Provider = {
			id: 'openai',
			name: 'OpenAI',
			apiKey: key,
			baseUrl: 'https://api.openai.com/v1',
		};

		if (openAiProviderIndex !== -1) {
			providers[openAiProviderIndex] = newProvider;
		} else {
			providers.push(newProvider);
		}
		this.setStoredModelProviders(providers);
	}

	getCronTasks(): CronTask[] {
		const legacyTasks = this.getTaskSchedulerSettings().legacyTasks;
		if (Array.isArray(legacyTasks)) return legacyTasks as CronTask[];
		return (this.store.get('cronTasks') as CronTask[] | undefined) ?? [];
	}

	setCronTasks(tasks: CronTask[]): void {
		this.setTaskSchedulerSettings({ legacyTasks: tasks });
		this.store.delete('cronTasks');
	}

	getCronSchedulerState(): CronStoreState {
		const managed = this.getTaskSchedulerSettings().managed;
		return migrateCronStoreState(
			managed ?? this.store.get('cronScheduler') ?? emptyCronStoreState()
		);
	}

	setCronSchedulerState(state: CronStoreState): void {
		this.setTaskSchedulerSettings({ managed: migrateCronStoreState(state) });
		this.store.delete('cronScheduler');
	}

	getFridayCronState(): FridayCronStoreState {
		const friday = this.getTaskSchedulerSettings().friday;
		return migrateFridayCronStoreState(
			friday ?? this.store.get('fridayCron') ?? emptyFridayCronStoreState()
		);
	}

	setFridayCronState(state: FridayCronStoreState): void {
		this.setTaskSchedulerSettings({ friday: migrateFridayCronStoreState(state) });
		this.store.delete('fridayCron');
	}

	getHeartbeatState(): HeartbeatStoreState {
		return migrateHeartbeatStoreState(this.store.get('heartbeat') ?? emptyHeartbeatStoreState());
	}

	setHeartbeatState(state: HeartbeatStoreState): void {
		this.store.set('heartbeat', migrateHeartbeatStoreState(state));
	}

	private getConfiguredModelOperator(
		key: ConfiguredModelOperatorKey
	): ConfiguredModelOperator | undefined {
		const rootKey = MODEL_MODULE_ROOT_KEYS[key];
		const settings = this.getModelModuleSettings(rootKey);
		if (settings) {
			const provider = this.getProviderById(settings.providerId);
			if (provider) {
				return configuredModelOperator(
					key,
					publicProvider(provider),
					modelForModule(key, settings)
				);
			}
		}

		const current = this.getLegacyOperator();
		const operator = current?.[key] as ModelOperator | undefined;
		if (hasModelSelection(operator)) {
			return configuredModelOperator(key, operator.provider, operator.model);
		}

		if (key === 'imageCreator') return undefined;

		const legacyOperator = current?.[LEGACY_MODEL_OPERATOR_KEYS[key]];
		if (hasModelSelection(legacyOperator)) {
			return configuredModelOperator(key, legacyOperator.provider, legacyOperator.model);
		}
		return undefined;
	}

	private getLegacyOperator(): OperatorStoreState | undefined {
		return this.store.get('service') as OperatorStoreState | undefined;
	}

	private getLegacyModelModuleSettings(
		key: LegacyBackedModelOperatorKey
	): ModelModuleSettings | undefined {
		const current = this.getLegacyOperator();
		const operator = current?.[key] as ModelOperator | undefined;
		if (hasModelSelection(operator)) {
			return modelModuleSettings(operator.provider.id, operator.model);
		}
		const legacyOperator = current?.[LEGACY_MODEL_OPERATOR_KEYS[key]];
		if (hasModelSelection(legacyOperator)) {
			return modelModuleSettings(legacyOperator.provider.id, legacyOperator.model);
		}
		return undefined;
	}

	private getModelModuleSettings(rootKey: ModelModuleRootKey): ModelModuleSettings | undefined {
		return readModelModuleSettings(this.store.get(rootKey));
	}

	private getStoredModelProviders(): Provider[] {
		const modelProviders = this.store.get('modelProviders');
		if (Array.isArray(modelProviders)) return modelProviders as Provider[];
		const providers = this.store.get('providers');
		return Array.isArray(providers) ? (providers as Provider[]) : [];
	}

	private setStoredModelProviders(providers: Provider[]): void {
		this.store.set('modelProviders', providers);
		this.store.delete('providers');
	}

	private getTaskSchedulerSettings(): TaskSchedulerSettings {
		return readRecord(this.store.get('taskScheduler')) ?? {};
	}

	private setTaskSchedulerSettings(patch: TaskSchedulerSettings): void {
		this.store.set('taskScheduler', {
			...this.getTaskSchedulerSettings(),
			...patch,
		});
	}

	getConnectors(): ConnectorConfig[] {
		return this.store.get('connectors') ?? [];
	}

	getConnectorById(id: string): ConnectorConfig | undefined {
		return this.getConnectors().find((connector) => connector.id === id);
	}

	setConnectors(connectors: ConnectorConfig[]): void {
		this.store.set('connectors', connectors);
	}

	getChannel(): Channel {
		const channel = this.store.get('channel');
		const next = createDefaultChannelState();
		if (channel?.defaults && typeof channel.defaults === 'object') {
			setChannelDefaults(next, channel.defaults);
		}
		for (const channelId of CHANNEL_PROVIDER_IDS) {
			setChannelConfigValue(
				next,
				channelId,
				mergeChannelConfig(channelId, getStoredChannelConfig(channel, channelId))
			);
		}
		return next;
	}

	getTelegramChannel(): TelegramChannelProperties {
		return this.getChannel().telegram;
	}

	getChannelConfig<TKey extends ChannelType>(type: TKey): Channel[TKey] {
		return this.getChannel()[type];
	}

	setChannelProperties<TKey extends ChannelType>(
		type: TKey,
		properties: Partial<Channel[TKey]>
	): Channel {
		const current = this.getChannel();
		const currentProperties =
			current[type] && typeof current[type] === 'object'
				? (current[type] as Record<string, unknown>)
				: {};
		const next: Channel = {
			...current,
			[type]: {
				...currentProperties,
				...properties,
			},
		};
		this.store.set('channel', next);
		return next;
	}

	setChannelConfig<TKey extends ChannelType>(type: TKey, config: Channel[TKey]): Channel[TKey] {
		const current = this.getChannel();
		const next: Channel = {
			...current,
			[type]: mergeChannelConfig(type, config) as Channel[TKey],
		};
		this.store.set('channel', next);
		return next[type];
	}

	setTelegramChannel(config: TelegramChannelProperties): TelegramChannelProperties {
		return this.setChannelProperties('telegram', {
			token: config.token,
			allowFrom: config.allowFrom,
			enabled: config.enabled,
			defaultAccountId: config.defaultAccountId,
			defaultTarget: config.defaultTarget,
			dmPolicy: config.dmPolicy,
			groupAllowFrom: config.groupAllowFrom,
			accounts: config.accounts,
		}).telegram;
	}

	setAnthropicApiKey(key: string): void {
		const providers = this.getStoredModelProviders();
		const anthropicProviderIndex = providers.findIndex(
			(provider) => provider.id.trim().toLowerCase() === 'anthropic'
		);

		const newProvider: Provider = {
			id: 'anthropic',
			name: 'Anthropic',
			apiKey: key,
			baseUrl: 'https://api.anthropic.com/v1',
		};

		if (anthropicProviderIndex !== -1) {
			providers[anthropicProviderIndex] = newProvider;
		} else {
			providers.push(newProvider);
		}
		this.setStoredModelProviders(providers);
	}
}

function createDefaultChannelState(): Channel {
	const state = {} as Channel;
	setChannelDefaults(state, {});
	for (const channelId of CHANNEL_PROVIDER_IDS) {
		setChannelConfigValue(state, channelId, createDefaultChannelConfig(channelId));
	}
	return state;
}

function setChannelDefaults(state: Channel, defaults: Channel['defaults']): void {
	Object.defineProperty(state, 'defaults', {
		value: defaults,
		enumerable: false,
		writable: true,
		configurable: true,
	});
}

function setChannelConfigValue<TKey extends ChannelType>(
	state: Channel,
	channelId: TKey,
	config: Channel[TKey]
): void {
	state[channelId] = config;
}

function createDefaultChannelConfig<TKey extends ChannelType>(channelId: TKey): Channel[TKey] {
	if (channelId === 'telegram') {
		return {
			token: '',
			allowFrom: [],
			enabled: false,
			defaultAccountId: 'default',
			dmPolicy: 'allowlist',
			groupAllowFrom: [],
		} as unknown as Channel[TKey];
	}
	if (channelId === 'whatsapp') {
		return {
			phoneNumber: '',
			token: '',
			enabled: false,
			defaultAccountId: 'default',
			dmPolicy: 'allowlist',
			allowFrom: [],
			groupAllowFrom: [],
		} as unknown as Channel[TKey];
	}
	if (channelId === 'discord') {
		return {
			token: '',
			allowFrom: [],
			enabled: false,
			defaultAccountId: 'default',
			dmPolicy: 'allowlist',
			groupAllowFrom: [],
		} as unknown as Channel[TKey];
	}

	const generic: GenericChannelProperties = {
		enabled: false,
		defaultAccountId: 'default',
		accounts: {
			default: createDefaultAccountConfig(channelId),
		},
	};
	return generic as Channel[TKey];
}

function createDefaultAccountConfig(channelId: ChannelType): ChannelAccountProperties {
	return {
		label: `${channelId} default`,
		enabled: false,
		token: '',
		serverUrl: '',
		webhookUrl: '',
		defaultTarget: '',
		allowFrom: [],
		groupAllowFrom: [],
		dmPolicy: 'allowlist',
	};
}

function getStoredChannelConfig(channel: Channel | undefined, channelId: ChannelType): unknown {
	if (!channel || typeof channel !== 'object') return undefined;
	return channel[channelId];
}

function mergeChannelConfig<TKey extends ChannelType>(
	channelId: TKey,
	stored: unknown
): Channel[TKey] {
	const defaults = createDefaultChannelConfig(channelId);
	if (!stored || typeof stored !== 'object') return defaults;
	const storedObject = stored as Record<string, unknown>;

	if (channelId === 'telegram') {
		return {
			...defaults,
			...storedObject,
			token: typeof storedObject.token === 'string' ? storedObject.token : '',
			allowFrom: normalizeStringList(storedObject.allowFrom),
			groupAllowFrom: normalizeStringList(storedObject.groupAllowFrom),
			accounts: normalizeAccounts(storedObject.accounts),
		} as Channel[TKey];
	}
	if (channelId === 'whatsapp') {
		return {
			...defaults,
			...storedObject,
			phoneNumber: typeof storedObject.phoneNumber === 'string' ? storedObject.phoneNumber : '',
			token: typeof storedObject.token === 'string' ? storedObject.token : '',
			allowFrom: normalizeStringList(storedObject.allowFrom),
			groupAllowFrom: normalizeStringList(storedObject.groupAllowFrom),
			accounts: normalizeAccounts(storedObject.accounts),
		} as Channel[TKey];
	}
	if (channelId === 'discord') {
		return {
			...defaults,
			...storedObject,
			token: typeof storedObject.token === 'string' ? storedObject.token : '',
			allowFrom: normalizeStringList(storedObject.allowFrom),
			groupAllowFrom: normalizeStringList(storedObject.groupAllowFrom),
			accounts: normalizeAccounts(storedObject.accounts),
		} as Channel[TKey];
	}

	return {
		...defaults,
		...storedObject,
		accounts:
			normalizeAccounts(storedObject.accounts) ?? (defaults as GenericChannelProperties).accounts,
	} as Channel[TKey];
}

function normalizeAccounts(input: unknown): Record<string, ChannelAccountProperties> | undefined {
	if (!input || typeof input !== 'object') return undefined;
	const accounts: Record<string, ChannelAccountProperties> = {};
	for (const [accountId, account] of Object.entries(input as Record<string, unknown>)) {
		if (!account || typeof account !== 'object') continue;
		const normalizedId = accountId.trim();
		if (!normalizedId) continue;
		const accountObject = account as Record<string, unknown>;
		accounts[normalizedId] = {
			label: readOptionalString(accountObject.label),
			enabled: typeof accountObject.enabled === 'boolean' ? accountObject.enabled : undefined,
			token: readOptionalString(accountObject.token),
			secret: readOptionalString(accountObject.secret),
			serverUrl: readOptionalString(accountObject.serverUrl),
			webhookUrl: readOptionalString(accountObject.webhookUrl),
			appId: readOptionalString(accountObject.appId),
			clientId: readOptionalString(accountObject.clientId),
			clientSecret: readOptionalString(accountObject.clientSecret),
			username: readOptionalString(accountObject.username),
			phoneNumber: readOptionalString(accountObject.phoneNumber),
			botUserId: readOptionalString(accountObject.botUserId),
			defaultTarget: readOptionalString(accountObject.defaultTarget),
			allowFrom: normalizeStringList(accountObject.allowFrom),
			groupAllowFrom: normalizeStringList(accountObject.groupAllowFrom),
			dmPolicy:
				accountObject.dmPolicy === 'pairing' ||
				accountObject.dmPolicy === 'open' ||
				accountObject.dmPolicy === 'deny'
					? accountObject.dmPolicy
					: 'allowlist',
			heartbeat: normalizeHeartbeatVisibility(accountObject.heartbeat),
		};
	}
	return Object.keys(accounts).length > 0 ? accounts : undefined;
}

function normalizeHeartbeatVisibility(input: unknown) {
	if (!input || typeof input !== 'object') return undefined;
	const source = input as Record<string, unknown>;
	return {
		showOk: typeof source.showOk === 'boolean' ? source.showOk : undefined,
		showAlerts: typeof source.showAlerts === 'boolean' ? source.showAlerts : undefined,
		useIndicator: typeof source.useIndicator === 'boolean' ? source.useIndicator : undefined,
	};
}

function normalizeStringList(input: unknown): string[] {
	if (!Array.isArray(input)) return [];
	return [...new Set(input.map((value) => String(value).trim()).filter(Boolean))];
}

function readOptionalString(input: unknown): string | undefined {
	return typeof input === 'string' ? input : undefined;
}
