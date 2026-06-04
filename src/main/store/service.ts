import Store from 'electron-store';
import { DEFAULT_PROVIDERS, type Provider } from '../../shared/providers';
import { getDefaultAgentModels } from '../../shared/agents/models';
import {
	getImageCreatorModels,
	getImageCreatorModelsForProvider,
	getSpeechToTextModels,
	isAllowedSpeechToTextModel,
	isModelReasoningEffort,
	type Model,
	type ModelSelection,
} from '../../shared/agents/service';
import {
	getMusicModelsByProvider,
	getTextToSpeechModelsByProvider,
	getTextToVideoModelsByProvider,
} from '../../shared/providers';
import type { CronTask } from '../../shared/cron';
import {
	CHANNEL_PROVIDER_IDS,
	type Channel,
	type ChannelAccountProperties,
	type ChannelType,
	type GenericChannelProperties,
	type TelegramChannelProperties,
} from '../../shared/channels';
import type {
	BackgroundTaskSettings,
	ModelProviderSettings,
	ModelModuleSettings,
	AgentModuleOptions,
	SettingsStoreAccessor,
	StoreSchema,
	TaskSchedulerSettings,
} from './types';
import type { CronJobStoreState } from '../cron/state';
import { emptyCronJobStoreState, migrateCronJobStoreState } from '../cron/state';

type ModelModuleKey =
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

const MODEL_MODULE_ROOT_KEYS = {
	assistant: 'llmAgent',
	speechToText: 'speechToText',
	textToSpeech: 'textToSpeech',
	imageCreator: 'imageCreator',
	textToVideo: 'textToVideo',
	textToSound: 'textToSound',
} satisfies Record<ModelModuleKey, ModelModuleRootKey>;

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

function modelFromCatalog(catalog: readonly Model[], settings: ModelModuleSettings): Model {
	const model = catalog.find((entry) => entry.id === settings.modelId) ?? {
		id: settings.modelId,
		name: settings.modelId,
	};
	return {
		...model,
		...(settings.effort ? { effort: settings.effort } : {}),
	};
}

function modelForModule(
	key: ModelModuleKey,
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

	getAssistantModel(): Model | undefined {
		return this.getModelSelection('assistant')?.model;
	}

	getAssistantProvider(): Omit<Provider, 'apiKey'> | undefined {
		return this.getModelSelection('assistant')?.provider;
	}

	getImageCreatorSettings(): ModelModuleSettings | undefined {
		return this.getModelModuleSettings('imageCreator');
	}

	getAssistantSettings(): ModelModuleSettings | undefined {
		return this.getModelModuleSettings('llmAgent');
	}

	getSpeechToTextSettings(): ModelModuleSettings | undefined {
		return this.getModelModuleSettings('speechToText');
	}

	getTextToSpeechSettings(): ModelModuleSettings | undefined {
		return this.getModelModuleSettings('textToSpeech');
	}

	getTextToVideoSettings(): ModelModuleSettings | undefined {
		return this.getModelModuleSettings('textToVideo');
	}

	getTextToSoundSettings(): ModelModuleSettings | undefined {
		return this.getModelModuleSettings('textToSound');
	}

	getCronSettings(): TaskSchedulerSettings {
		return this.getTaskSchedulerSettings();
	}

	getTaskSettings(): TaskSchedulerSettings {
		return this.getTaskSchedulerSettings();
	}

	getAgentRuntimePreference(): string | undefined {
		const settings = this.getModelModuleSettings('llmAgent');
		return settings ? readAgentModuleOptions(settings.options)?.agentRuntime : undefined;
	}

	setAgentRuntimePreference(agentRuntime?: string): boolean {
		const runtime = normalizeAgentRuntime(agentRuntime);
		const settings = this.getModelModuleSettings('llmAgent');
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
			...(Object.keys(nextOptions).length > 0 ? { options: nextOptions } : {}),
		};
		this.store.set('llmAgent', nextSettings);
		return true;
	}

	getBackgroundTaskSettings(): BackgroundTaskSettings {
		return readBackgroundTaskSettings(this.store.get('backgroundTask'));
	}

	getAgentModel(): Model | undefined {
		return this.getAssistantModel();
	}

	getAgentProvider(): Omit<Provider, 'apiKey'> | undefined {
		return this.getAssistantProvider();
	}

	getAgentService(): ModelSelection | undefined {
		return this.getModelSelection('assistant');
	}

	getSpeechTranscriberService(): ModelSelection | undefined {
		return this.getModelSelection('speechToText');
	}

	getTextToSpeechService(): ModelSelection | undefined {
		return this.getModelSelection('textToSpeech');
	}

	getImageCreatorService(): ModelSelection | undefined {
		return this.getModelSelection('imageCreator');
	}

	getTextToVideoService(): ModelSelection | undefined {
		return this.getModelSelection('textToVideo');
	}

	getTextToSoundService(): ModelSelection | undefined {
		return this.getModelSelection('textToSound');
	}

	setAgentService(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		const current = this.getModelModuleSettings('llmAgent');
		this.store.set('llmAgent', modelModuleSettings(provider.id, model, current?.options));
		return true;
	}

	setSpeechTranscriberService(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
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

	setTextToSpeechService(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		const catalogModel = getTextToSpeechModelsByProvider(provider.id).find(
			(entry) => entry.id === model.id
		);
		if (!catalogModel) {
			return false;
		}
		const current = this.getModelModuleSettings('textToSpeech');
		this.store.set(
			'textToSpeech',
			modelModuleSettings(provider.id, catalogModel, current?.options)
		);
		return true;
	}

	setImageCreatorService(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		const catalogModel = getImageCreatorModelsForProvider(provider).find(
			(entry) => entry.id === model.id
		);
		if (!catalogModel) {
			return false;
		}
		const current = this.getModelModuleSettings('imageCreator');
		this.store.set(
			'imageCreator',
			modelModuleSettings(provider.id, catalogModel, current?.options)
		);
		return true;
	}

	setTextToVideoService(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		const catalogModel = getTextToVideoModelsByProvider(provider.id).find(
			(entry) => entry.id === model.id
		);
		if (!catalogModel) {
			return false;
		}
		const current = this.getModelModuleSettings('textToVideo');
		this.store.set(
			'textToVideo',
			modelModuleSettings(provider.id, catalogModel, current?.options)
		);
		return true;
	}

	setTextToSoundService(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		const catalogModel = getMusicModelsByProvider(provider.id).find(
			(entry) => entry.id === model.id
		);
		if (!catalogModel) {
			return false;
		}
		const current = this.getModelModuleSettings('textToSound');
		this.store.set(
			'textToSound',
			modelModuleSettings(provider.id, catalogModel, current?.options)
		);
		return true;
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
		return [];
	}

	setCronTasks(tasks: CronTask[]): void {
		this.setTaskSchedulerSettings({ legacyTasks: tasks });
	}

	getCronJobState(): CronJobStoreState {
		const settings = this.getTaskSchedulerSettings();
		const legacyKey = ['fri', 'day'].join('');
		const legacy = (settings as Record<string, unknown>)[legacyKey];
		return migrateCronJobStoreState(settings.jobs ?? legacy ?? emptyCronJobStoreState());
	}

	setCronJobState(state: CronJobStoreState): void {
		this.setTaskSchedulerSettings({ jobs: migrateCronJobStoreState(state) });
	}

	private getModelSelection(key: ModelModuleKey): ModelSelection | undefined {
		const rootKey = MODEL_MODULE_ROOT_KEYS[key];
		const settings = this.getModelModuleSettings(rootKey);
		if (settings) {
			const provider = this.getProviderById(settings.providerId);
			if (provider) {
				return {
					provider: publicProvider(provider),
					model: modelForModule(key, settings, provider),
				};
			}
		}

		return undefined;
	}

	private getModelModuleSettings(rootKey: ModelModuleRootKey): ModelModuleSettings | undefined {
		return readModelModuleSettings(this.store.get(rootKey));
	}

	private getStoredModelProviders(): Provider[] {
		return readModelProviderSettingsList(this.store.get('modelProviders')).map(
			providerFromSettings
		);
	}

	private setStoredModelProviders(providers: Provider[]): void {
		this.store.set('modelProviders', providers.map(modelProviderSettings));
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

	getChannel(): Channel {
		const channel = this.getStoredChannelRoot();
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
		const current = this.getStoredChannelRoot();
		const currentProperties = readRecord(current[type]) ?? {};
		const next = compactChannelRoot({
			...current,
			[type]: mergeChannelConfig(type, {
				...currentProperties,
				...properties,
			}),
		});
		this.store.set('channels', next);
		return this.getChannel();
	}

	setChannelConfig<TKey extends ChannelType>(type: TKey, config: Channel[TKey]): Channel[TKey] {
		const current = this.getStoredChannelRoot();
		const next = compactChannelRoot({
			...current,
			[type]: mergeChannelConfig(type, config) as Channel[TKey],
		});
		this.store.set('channels', next);
		return this.getChannel()[type];
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

	private getStoredChannelRoot(): Partial<Channel> {
		return readStoredChannel(this.store.get('channels') ?? this.store.get('channel')) ?? {};
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

function readStoredChannel(value: unknown): Partial<Channel> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return compactChannelRoot(value as Partial<Channel>);
}

function compactChannelRoot(channel: Partial<Channel>): Partial<Channel> {
	const next: Partial<Channel> = {};
	if (readRecord(channel.defaults)) next.defaults = removeUndefinedProperties(channel.defaults);
	for (const channelId of CHANNEL_PROVIDER_IDS) {
		const config = channel[channelId];
		if (readRecord(config)) {
			(next as Partial<Record<ChannelType, unknown>>)[channelId] = removeUndefinedProperties(config);
		}
	}
	return next;
}

function removeUndefinedProperties<T>(value: T): T {
	if (Array.isArray(value)) return value.map(removeUndefinedProperties) as T;
	if (!value || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
			item === undefined ? [] : [[key, removeUndefinedProperties(item)]]
		)
	) as T;
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

function getStoredChannelConfig(channel: Partial<Channel> | undefined, channelId: ChannelType): unknown {
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
