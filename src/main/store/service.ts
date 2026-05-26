import Store from 'electron-store';
import { getDefaultAgentModels, isAllowedAgentModel } from '../../shared/agents/models';
import {
	OPERATOR_DEFINITIONS,
	getImageCreatorModels,
	getImageCreatorModelsForProvider,
	getSpeechToTextModels,
	isAllowedImageCreatorModelForProvider,
	isAllowedMusicCreatorModel,
	isAllowedSpeechToTextModel,
	isAllowedTextToSpeechModel,
	isAllowedTextToVideoModel,
	isModelReasoningEffort,
	type ConfiguredModelOperator,
	type Model,
	type ModelOperatorSelection,
	type OperatorStoreState,
} from '../../shared/agents/service';
import type {
	CronJsonObject,
	CronSchedule,
	CronStoreState,
	CronStoredSchedule,
	CronTask,
} from '../../shared/cron';
import type {
	AgentHeartbeatConfig,
	AgentsHeartbeatConfig,
	HeartbeatStoreState,
} from '../../shared/heartbeat';
import { DEFAULT_PROVIDERS, type Provider } from '../../shared/providers';
import {
	getMusicModelsByProvider,
	getTextToSpeechModelsByProvider,
	getTextToVideoModelsByProvider,
} from '../../shared/providers';
import type {
	AgentConfig,
	AgentModuleOptions,
	AgentRouteBinding,
	AgentRoutePeer,
	AgentRouteSessionScope,
	AgentRoutingSettings,
	CronSettings,
	ModelModuleSettings,
	SettingsStoreAccessor,
	StoreSchema,
	TaskSettings,
} from '../../shared/store';

export interface StoreLogger {
	debug(source: string, message: string, data?: unknown): void;
	info(source: string, message: string, data?: unknown): void;
	warn(source: string, message: string, data?: unknown): void;
	error(source: string, message: string, data?: unknown): void;
}

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

const STORE_LOG_SOURCE = 'StoreService';
const CRON_STORE_SCHEMA_VERSION = 1;

const AGENT_ROUTE_SESSION_SCOPES = new Set<AgentRouteSessionScope>([
	'main',
	'per-peer',
	'per-channel-peer',
	'per-account-channel-peer',
]);

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

function defaultProviderForId(id: string): Provider | undefined {
	const providerId = id.trim().toLowerCase();
	return DEFAULT_PROVIDERS.find((provider) => provider.id.trim().toLowerCase() === providerId);
}

function providerFromSettings(settings: Provider): Provider {
	return {
		...(defaultProviderForId(settings.id) ?? {}),
		...settings,
	};
}

function providerSettings(
	provider: Provider
): Pick<Provider, 'id' | 'name' | 'baseUrl' | 'apiKey'> {
	return {
		id: provider.id.trim().toLowerCase(),
		name: provider.name.trim(),
		baseUrl: provider.baseUrl.trim(),
		apiKey: provider.apiKey.trim(),
	};
}

function readProviderSettings(value: unknown): Provider | undefined {
	const record = readRecord(value);
	if (!record) return undefined;
	const id = typeof record.id === 'string' ? record.id.trim().toLowerCase() : '';
	const name = typeof record.name === 'string' ? record.name.trim() : '';
	const baseUrl = typeof record.baseUrl === 'string' ? record.baseUrl.trim() : '';
	const apiKey = typeof record.apiKey === 'string' ? record.apiKey.trim() : '';
	if (!id || !name || !baseUrl) return undefined;
	return { id, name, baseUrl, apiKey };
}

function readProviderSettingsList(value: unknown): Provider[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry) => {
		const provider = readProviderSettings(entry);
		return provider ? [provider] : [];
	});
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

function normalizeAgentRuntime(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
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
	if (key === 'speechToText') return isAllowedSpeechToTextModel(provider.id, settings.modelId);
	if (key === 'textToSpeech') return isAllowedTextToSpeechModel(provider.id, settings.modelId);
	if (key === 'imageCreator') {
		return isAllowedImageCreatorModelForProvider(provider, settings.modelId);
	}
	if (key === 'textToVideo') return isAllowedTextToVideoModel(provider.id, settings.modelId);
	if (key === 'textToSound') return isAllowedMusicCreatorModel(provider.id, settings.modelId);
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

function readTaskSettings(value: unknown): TaskSettings {
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

function normalizeId(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function normalizeLowerId(value: unknown): string | undefined {
	return normalizeId(value)?.toLowerCase();
}

function normalizeAgentStringList(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const list = [
		...new Set(
			value.flatMap((item) => (typeof item === 'string' && item.trim() ? [item.trim()] : []))
		),
	];
	return list.length > 0 ? list : undefined;
}

function normalizePositiveInteger(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

function normalizeAgentRoutePeer(value: unknown, allowThread: boolean): AgentRoutePeer | undefined {
	const record = readRecord(value);
	if (!record) return undefined;
	const kind = normalizeLowerId(record.kind);
	const allowedKinds = allowThread
		? new Set(['direct', 'group', 'channel', 'thread'])
		: new Set(['direct', 'group', 'channel']);
	if (!kind || !allowedKinds.has(kind)) return undefined;
	const id = normalizeId(record.id);
	return id ? { kind: kind as AgentRoutePeer['kind'], id } : undefined;
}

function normalizeAgentConfig(value: unknown): AgentConfig | undefined {
	const record = readRecord(value);
	if (!record) return undefined;
	const id = normalizeId(record.id);
	if (!id) return undefined;
	const model = readRecord(record.model);
	const tools = readRecord(record.tools);
	const subagents = readRecord(record.subagents);
	const childModel = readRecord(subagents?.model);
	const config: AgentConfig = { id };
	if (record.default === true) config.default = true;
	const name = normalizeId(record.name);
	if (name) config.name = name;
	const workspace = normalizeId(record.workspace);
	if (workspace) config.workspace = workspace;
	const providerId = normalizeLowerId(model?.providerId);
	const modelId = normalizeId(model?.modelId);
	if (providerId || modelId || typeof model?.effort === 'string') {
		config.model = {
			...(providerId ? { providerId } : {}),
			...(modelId ? { modelId } : {}),
			...(typeof model?.effort === 'string'
				? { effort: model.effort as NonNullable<AgentConfig['model']>['effort'] }
				: {}),
		};
	}
	const skills = normalizeAgentStringList(record.skills);
	if (skills) config.skills = skills;
	if (tools) {
		const allow = normalizeAgentStringList(tools.allow);
		const alsoAllow = normalizeAgentStringList(tools.alsoAllow);
		const deny = normalizeAgentStringList(tools.deny);
		config.tools = {
			...(tools.profile === 'minimal' ||
			tools.profile === 'coding' ||
			tools.profile === 'messaging' ||
			tools.profile === 'full'
				? { profile: tools.profile }
				: {}),
			...(allow ? { allow } : {}),
			...(alsoAllow ? { alsoAllow } : {}),
			...(deny ? { deny } : {}),
			...(readRecord(tools.fs) ? { fs: tools.fs as NonNullable<AgentConfig['tools']>['fs'] } : {}),
			...(readRecord(tools.exec) ? { exec: tools.exec as Record<string, unknown> } : {}),
		};
	}
	if (subagents) {
		const allowAgents = normalizeAgentStringList(subagents.allowAgents);
		const childProviderId = normalizeLowerId(childModel?.providerId);
		const childModelId = normalizeId(childModel?.modelId);
		config.subagents = {
			...(allowAgents ? { allowAgents } : {}),
			...(normalizePositiveInteger(subagents.maxSpawnDepth)
				? { maxSpawnDepth: normalizePositiveInteger(subagents.maxSpawnDepth) }
				: {}),
			...(normalizePositiveInteger(subagents.maxChildrenPerAgent)
				? { maxChildrenPerAgent: normalizePositiveInteger(subagents.maxChildrenPerAgent) }
				: {}),
			...(subagents.requireAgentId === true ? { requireAgentId: true } : {}),
			...(childProviderId || childModelId || typeof childModel?.effort === 'string'
				? {
						model: {
							...(childProviderId ? { providerId: childProviderId } : {}),
							...(childModelId ? { modelId: childModelId } : {}),
							...(typeof childModel?.effort === 'string'
								? { effort: childModel.effort as NonNullable<AgentConfig['model']>['effort'] }
								: {}),
						},
					}
				: {}),
			...(normalizePositiveInteger(subagents.runTimeoutSeconds)
				? { runTimeoutSeconds: normalizePositiveInteger(subagents.runTimeoutSeconds) }
				: {}),
		};
	}
	return config;
}

function normalizeAgentRouteBinding(value: unknown): AgentRouteBinding | undefined {
	const record = readRecord(value);
	if (!record) return undefined;
	const agentId = normalizeId(record.agentId);
	const match = readRecord(record.match);
	if (!agentId || !match) return undefined;
	const channel = normalizeLowerId(match.channel);
	const accountId = normalizeId(match.accountId);
	const peer = normalizeAgentRoutePeer(match.peer, true);
	const parentPeer = normalizeAgentRoutePeer(
		match.parentPeer,
		false
	) as AgentRouteBinding['match']['parentPeer'];
	const roleIds = normalizeAgentStringList(match.roleIds);
	if (!channel && !accountId && !peer && !parentPeer && !roleIds) return undefined;
	const session = readRecord(record.session);
	const scope = normalizeId(session?.scope);
	return {
		agentId,
		match: {
			...(channel ? { channel } : {}),
			...(accountId ? { accountId } : {}),
			...(peer ? { peer } : {}),
			...(parentPeer ? { parentPeer } : {}),
			...(roleIds ? { roleIds } : {}),
		},
		...(scope && AGENT_ROUTE_SESSION_SCOPES.has(scope as AgentRouteSessionScope)
			? { session: { scope: scope as AgentRouteSessionScope } }
			: {}),
	};
}

function normalizeAgentRoutingSettings(value: unknown): AgentRoutingSettings {
	const record = readRecord(value);
	const agents = Array.isArray(record?.agents)
		? record.agents.flatMap((entry) => {
				const agent = normalizeAgentConfig(entry);
				return agent ? [agent] : [];
			})
		: [];
	const bindings = Array.isArray(record?.bindings)
		? record.bindings.flatMap((entry) => {
				const binding = normalizeAgentRouteBinding(entry);
				return binding ? [binding] : [];
			})
		: [];
	return { agents, bindings };
}

function emptyHeartbeatStoreState(): HeartbeatStoreState {
	return {
		version: 1,
		taskState: {},
		lastDelivered: {},
	};
}

function normalizeHeartbeatStoreState(raw: unknown): HeartbeatStoreState {
	if (!raw || typeof raw !== 'object') return emptyHeartbeatStoreState();
	const record = raw as Partial<HeartbeatStoreState>;
	return {
		version: 1,
		taskState: sanitizeHeartbeatRecord(record.taskState, (value) => {
			const lastRunMs = readFiniteNumber(value, 'lastRunMs');
			return lastRunMs === undefined ? undefined : { lastRunMs };
		}),
		lastDelivered: sanitizeHeartbeatRecord(record.lastDelivered, (value) => {
			const text = readString(value, 'text');
			const atMs = readFiniteNumber(value, 'atMs');
			return text && atMs !== undefined ? { text, atMs } : undefined;
		}),
	};
}

function sanitizeHeartbeatRecord<T>(
	value: unknown,
	normalize: (value: unknown) => T | undefined
): Record<string, T> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
	const out: Record<string, T> = {};
	for (const [key, entry] of Object.entries(value)) {
		const normalized = normalize(entry);
		if (normalized !== undefined) out[key] = normalized;
	}
	return out;
}

function readFiniteNumber(value: unknown, key: string): number | undefined {
	if (!value || typeof value !== 'object') return undefined;
	const raw = (value as Record<string, unknown>)[key];
	return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

function readString(value: unknown, key: string): string | undefined {
	if (!value || typeof value !== 'object') return undefined;
	const raw = (value as Record<string, unknown>)[key];
	return typeof raw === 'string' && raw.trim() ? raw : undefined;
}

function emptyCronStoreState(): CronStoreState {
	return {
		schemaVersion: CRON_STORE_SCHEMA_VERSION,
		schedules: [],
		events: [],
		executions: [],
		locks: {},
		confirmations: [],
		quarantined: [],
	};
}

function storedScheduleConfig(schedule: Record<string, unknown>): CronStoredSchedule {
	if (typeof schedule.schedule === 'string' || readRecord(schedule.schedule)) {
		return schedule.schedule as CronStoredSchedule;
	}
	if (typeof schedule.cronExpression === 'string') return schedule.cronExpression;
	return {
		type: typeof schedule.type === 'string' ? schedule.type : 'cron',
		...(typeof schedule.intervalMs === 'number' ? { intervalMs: schedule.intervalMs } : {}),
		...(typeof schedule.runAt === 'string' ? { runAt: schedule.runAt } : {}),
		...(typeof schedule.startAt === 'string' ? { startAt: schedule.startAt } : {}),
		...(typeof schedule.endAt === 'string' ? { endAt: schedule.endAt } : {}),
		...(typeof schedule.maxRuns === 'number' ? { maxRuns: schedule.maxRuns } : {}),
	};
}

function normalizeSchedule(value: Record<string, unknown>): CronSchedule {
	const taskType = typeof value.taskType === 'string' ? value.taskType : 'cron.job';
	const taskInput = value.taskInput ?? {};
	return {
		...value,
		schedule: storedScheduleConfig(value),
		failureCount: typeof value.failureCount === 'number' ? value.failureCount : 0,
		target:
			typeof value.target === 'string'
				? value.target
				: taskType === 'agent' || taskType.startsWith('agent.')
					? 'agent'
					: 'job',
		payload: value.payload ?? taskInput,
		runCount: typeof value.runCount === 'number' ? value.runCount : 0,
	} as unknown as CronSchedule;
}

function normalizeCronStoreState(raw: unknown): CronStoreState {
	const record = readRecord(raw);
	if (!record) return emptyCronStoreState();
	const base = emptyCronStoreState();
	return {
		schemaVersion: CRON_STORE_SCHEMA_VERSION,
		schedules: Array.isArray(record.schedules)
			? record.schedules.flatMap((schedule) => {
					const scheduleRecord = readRecord(schedule);
					return scheduleRecord ? [normalizeSchedule(scheduleRecord)] : [];
				})
			: base.schedules,
		events: Array.isArray(record.events)
			? (record.events.filter(readRecord) as unknown as CronStoreState['events'])
			: base.events,
		executions: Array.isArray(record.executions)
			? (record.executions.filter(readRecord) as unknown as CronStoreState['executions'])
			: base.executions,
		locks: readRecord(record.locks) ? (record.locks as CronStoreState['locks']) : base.locks,
		confirmations: Array.isArray(record.confirmations)
			? (record.confirmations.filter(readRecord) as unknown as CronStoreState['confirmations'])
			: base.confirmations,
		quarantined: Array.isArray(record.quarantined)
			? (record.quarantined.filter(readRecord) as CronJsonObject[])
			: base.quarantined,
	};
}

function readCronSettings(value: unknown): CronSettings {
	const record = readRecord(value);
	if (!record) return {};
	return {
		...(typeof record.enabled === 'boolean' ? { enabled: record.enabled } : {}),
		...(record.scheduler !== undefined
			? { scheduler: normalizeCronStoreState(record.scheduler) }
			: {}),
		...(Array.isArray(record.tasks) ? { tasks: record.tasks as CronTask[] } : {}),
	};
}

export class StoreService {
	private store: SettingsStoreAccessor;
	private keepAwakeEnabled = false;

	constructor(private readonly logger?: StoreLogger) {
		try {
			this.store = new Store<StoreSchema>({
				name: 'settings',
				accessPropertiesByDotNotation: false,
			}) as unknown as SettingsStoreAccessor;
			this.logInfo('Initialized settings store');
		} catch (error) {
			this.logError('Failed to initialize settings store', error);
			throw error;
		}
	}

	getProviderById(id: string): Provider | undefined {
		const providerId = id.trim().toLowerCase();
		this.logDebug('Reading provider by id', { providerId });
		return this.getStoredProviders().find(
			(provider) => provider.id.trim().toLowerCase() === providerId
		);
	}

	getProviders(): Provider[] {
		this.logDebug('Reading providers');
		return this.getStoredProviders();
	}

	addProvider(input: Provider): Provider {
		const id = input.id.trim().toLowerCase();
		const providers = this.getStoredProviders();
		const exists = providers.some((provider) => provider.id.trim().toLowerCase() === id);

		if (exists) {
			this.logWarn('Provider validation failed', { providerId: id, reason: 'duplicate' });
			throw new Error(`Provider already exists: ${input.id}`);
		}

		const provider: Provider = {
			id,
			name: input.name.trim(),
			baseUrl: input.baseUrl.trim(),
			apiKey: input.apiKey.trim(),
		};

		this.setStoredProviders([...providers, provider]);
		return provider;
	}

	upsertProvider(input: Provider): void {
		const id = input.id.trim().toLowerCase();
		const providers = this.getStoredProviders();
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
		this.setStoredProviders(providers);
	}

	setOpenAiApiKey(key: string): void {
		this.upsertProvider({
			id: 'openai',
			name: 'OpenAI',
			apiKey: key,
			baseUrl: 'https://api.openai.com/v1',
		});
	}

	setAnthropicApiKey(key: string): void {
		this.upsertProvider({
			id: 'anthropic',
			name: 'Anthropic',
			apiKey: key,
			baseUrl: 'https://api.anthropic.com/v1',
		});
	}

	getOperator(): OperatorStoreState | undefined {
		const next: OperatorStoreState = {};
		const assistant = this.getAssistantOperator();
		if (assistant) next.assistant = assistant;
		const speechToText = this.getSpeechToTextOperator();
		if (speechToText) next.speechToText = speechToText;
		const textToSpeech = this.getTextToSpeechOperator();
		if (textToSpeech) next.textToSpeech = textToSpeech;
		const imageCreator = this.getImageCreatorOperator();
		if (imageCreator) next.imageCreator = imageCreator;
		const textToVideo = this.getTextToVideoOperator();
		if (textToVideo) next.videoCreator = textToVideo;
		const textToSound = this.getTextToSoundOperator();
		if (textToSound) next.musicCreator = textToSound;
		const agents = readAgentsHeartbeatConfig(this.getModelModuleSettings('assistant'));
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
		const nextAgents: AgentsHeartbeatConfig = {
			...currentAgents,
			defaults: {
				...currentDefaults,
				heartbeat: nextHeartbeat,
			},
		};
		if (currentAgentSettings) {
			this.write('assistant', {
				...currentAgentSettings,
				options: {
					...(currentAgentSettings.options ?? {}),
					agents: nextAgents,
				},
			});
		}
		return nextHeartbeat;
	}

	getAssistantOperator(): ConfiguredModelOperator | undefined {
		return this.getConfiguredModelOperator('assistant');
	}

	getAssistantSettings(): ModelModuleSettings | undefined {
		return this.getModelModuleSettings('assistant');
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

	getSpeechToTextSettings(): ModelModuleSettings | undefined {
		return this.getModelModuleSettings('speechToText');
	}

	getTextToSpeechOperator(): ConfiguredModelOperator | undefined {
		return this.getConfiguredModelOperator('textToSpeech');
	}

	getTextToSpeechSettings(): ModelModuleSettings | undefined {
		return this.getModelModuleSettings('textToSpeech');
	}

	getImageCreatorOperator(): ConfiguredModelOperator | undefined {
		return this.getConfiguredModelOperator('imageCreator');
	}

	getTextToVideoOperator(): ConfiguredModelOperator | undefined {
		return this.getConfiguredModelOperator('textToVideo');
	}

	getTextToVideoSettings(): ModelModuleSettings | undefined {
		return this.getModelModuleSettings('textToVideo');
	}

	getTextToSoundOperator(): ConfiguredModelOperator | undefined {
		return this.getConfiguredModelOperator('textToSound');
	}

	getMusicCreatorOperator(): ConfiguredModelOperator | undefined {
		return this.getTextToSoundOperator();
	}

	getTextToSoundSettings(): ModelModuleSettings | undefined {
		return this.getModelModuleSettings('textToSound');
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
		if (!settings) return false;
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
		this.write('assistant', nextSettings);
		return true;
	}

	setAssistantOperator(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider) {
			this.logWarn('Rejected assistant model selection', { providerId });
			return false;
		}
		const current = this.getModelModuleSettings('assistant');
		this.write('assistant', modelModuleSettings(provider.id, model, current?.options));
		return true;
	}

	setSpeechToTextOperator(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider || !isAllowedSpeechToTextModel(provider.id, model.id)) {
			this.logWarn('Rejected speech-to-text model selection', { providerId, modelId: model.id });
			return false;
		}
		const current = this.getModelModuleSettings('speechToText');
		const catalogModel = getSpeechToTextModels(provider.id).find((entry) => entry.id === model.id);
		this.write(
			'speechToText',
			modelModuleSettings(provider.id, catalogModel ?? model, current?.options)
		);
		return true;
	}

	setTextToSpeechOperator(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider || !isAllowedTextToSpeechModel(provider.id, model.id)) {
			this.logWarn('Rejected text-to-speech model selection', { providerId, modelId: model.id });
			return false;
		}
		const current = this.getModelModuleSettings('textToSpeech');
		const catalogModel = getTextToSpeechModelsByProvider(provider.id).find(
			(entry) => entry.id === model.id
		);
		this.write(
			'textToSpeech',
			modelModuleSettings(provider.id, catalogModel ?? model, current?.options)
		);
		return true;
	}

	setImageCreatorOperator(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider || !isAllowedImageCreatorModelForProvider(provider, model.id)) {
			this.logWarn('Rejected image creator model selection', { providerId, modelId: model.id });
			return false;
		}
		const catalogModel = getImageCreatorModelsForProvider(provider).find(
			(entry) => entry.id === model.id
		);
		const current = this.getModelModuleSettings('imageCreator');
		this.write(
			'imageCreator',
			modelModuleSettings(provider.id, catalogModel ?? model, current?.options)
		);
		return true;
	}

	setTextToVideoOperator(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider || !isAllowedTextToVideoModel(provider.id, model.id)) {
			this.logWarn('Rejected text-to-video model selection', { providerId, modelId: model.id });
			return false;
		}
		const current = this.getModelModuleSettings('textToVideo');
		const catalogModel = getTextToVideoModelsByProvider(provider.id).find(
			(entry) => entry.id === model.id
		);
		this.write(
			'textToVideo',
			modelModuleSettings(provider.id, catalogModel ?? model, current?.options)
		);
		return true;
	}

	setTextToSoundOperator(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider || !isAllowedMusicCreatorModel(provider.id, model.id)) {
			this.logWarn('Rejected text-to-sound model selection', { providerId, modelId: model.id });
			return false;
		}
		const current = this.getModelModuleSettings('textToSound');
		const catalogModel = getMusicModelsByProvider(provider.id).find(
			(entry) => entry.id === model.id
		);
		this.write(
			'textToSound',
			modelModuleSettings(provider.id, catalogModel ?? model, current?.options)
		);
		return true;
	}

	setMusicCreatorOperator(providerId: string, model: Model): boolean {
		return this.setTextToSoundOperator(providerId, model);
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

	getKeepAwakeEnabled(): boolean {
		return this.keepAwakeEnabled;
	}

	setKeepAwakeEnabled(enabled: boolean): { readonly keepAwakeEnabled: boolean } {
		this.keepAwakeEnabled = enabled;
		this.logDebug('Updated keep-awake runtime setting', { enabled });
		return { keepAwakeEnabled: enabled };
	}

	getAgentRoutingSettings(): AgentRoutingSettings {
		const raw = this.read('agents');
		if (raw !== undefined && !readRecord(raw)) {
			this.logWarn('Invalid stored agent routing settings');
		}
		return normalizeAgentRoutingSettings(raw);
	}

	getConfiguredAgents(): AgentConfig[] {
		return this.getAgentRoutingSettings().agents;
	}

	getAgentConfig(id: string): AgentConfig | undefined {
		const agentId = id.trim();
		if (!agentId) return undefined;
		return this.getConfiguredAgents().find((agent) => agent.id === agentId);
	}

	setAgentRoutingSettings(settings: unknown): AgentRoutingSettings {
		const next = normalizeAgentRoutingSettings(settings);
		this.write('agents', next);
		return next;
	}

	getCronSettings(): CronSettings {
		const settings = this.getStoredCronSettings();
		return {
			...settings,
			scheduler: settings.scheduler ?? emptyCronStoreState(),
			tasks: settings.tasks ?? [],
		};
	}

	setCronSettings(settings: unknown): CronSettings {
		const next = readCronSettings(settings);
		this.write('cron', next);
		return this.getCronSettings();
	}

	getCronTasks(): CronTask[] {
		return this.getStoredCronSettings().tasks ?? [];
	}

	setCronTasks(tasks: CronTask[]): void {
		this.write('cron', {
			...this.getStoredCronSettings(),
			tasks,
		});
	}

	getCronSchedulerState(): CronStoreState {
		return this.getStoredCronSettings().scheduler ?? emptyCronStoreState();
	}

	setCronSchedulerState(state: CronStoreState): void {
		this.write('cron', {
			...this.getStoredCronSettings(),
			scheduler: normalizeCronStoreState(state),
		});
	}

	getTaskSettings(): TaskSettings {
		const raw = this.read('task');
		if (raw !== undefined && !readRecord(raw)) this.logWarn('Invalid stored task settings');
		return readTaskSettings(raw);
	}

	setTaskSettings(settings: unknown): TaskSettings {
		const next = readTaskSettings(settings);
		this.write('task', next);
		return next;
	}

	getHeartbeatState(): HeartbeatStoreState {
		try {
			return normalizeHeartbeatStoreState(this.read('heartbeat'));
		} catch (error) {
			this.logError('Failed to normalize heartbeat state', error);
			throw error;
		}
	}

	setHeartbeatState(state: HeartbeatStoreState): void {
		try {
			this.write('heartbeat', normalizeHeartbeatStoreState(state));
		} catch (error) {
			this.logError('Failed to persist heartbeat state', error);
			throw error;
		}
	}

	private getStoredProviders(): Provider[] {
		const raw = this.read('providers');
		if (raw !== undefined && !Array.isArray(raw)) this.logWarn('Invalid stored providers root');
		return readProviderSettingsList(raw).map(providerFromSettings);
	}

	private setStoredProviders(providers: Provider[]): void {
		this.write('providers', providers.map(providerSettings));
	}

	private getConfiguredModelOperator(
		key: ConfiguredModelOperatorKey
	): ConfiguredModelOperator | undefined {
		const settings = this.getModelModuleSettings(MODEL_MODULE_ROOT_KEYS[key]);
		if (!settings) return undefined;
		const provider = this.getProviderById(settings.providerId);
		if (!provider || !isAllowedModuleModel(key, settings, provider)) {
			this.logWarn('Dropped invalid stored model module selection', {
				module: key,
				providerId: settings.providerId,
				modelId: settings.modelId,
			});
			return undefined;
		}
		return configuredModelOperator(
			key,
			publicProvider(provider),
			modelForModule(key, settings, provider)
		);
	}

	private getModelModuleSettings(rootKey: ModelModuleRootKey): ModelModuleSettings | undefined {
		const raw = this.read(rootKey);
		const settings = readModelModuleSettings(raw);
		if (raw !== undefined && !settings) {
			this.logWarn('Invalid stored model module settings', { module: rootKey });
		}
		return settings;
	}

	private getStoredCronSettings(): CronSettings {
		const raw = this.read('cron');
		if (raw !== undefined && !readRecord(raw)) this.logWarn('Invalid stored cron settings');
		return readCronSettings(raw);
	}

	private read<TKey extends keyof StoreSchema>(key: TKey): StoreSchema[TKey] {
		try {
			const value = this.store.get(key);
			this.logDebug('Read settings property', { key });
			return value;
		} catch (error) {
			this.logError('Failed to read settings property', { key, error: this.errorMessage(error) });
			throw error;
		}
	}

	private write<TKey extends keyof StoreSchema>(key: TKey, value: StoreSchema[TKey]): void {
		try {
			this.store.set(key, value);
			this.logDebug('Wrote settings property', { key });
		} catch (error) {
			this.logError('Failed to write settings property', { key, error: this.errorMessage(error) });
			throw error;
		}
	}

	private logDebug(message: string, data?: unknown): void {
		this.logger?.debug(STORE_LOG_SOURCE, message, data);
	}

	private logInfo(message: string, data?: unknown): void {
		this.logger?.info(STORE_LOG_SOURCE, message, data);
	}

	private logWarn(message: string, data?: unknown): void {
		this.logger?.warn(STORE_LOG_SOURCE, message, data);
	}

	private logError(message: string, data?: unknown): void {
		this.logger?.error(STORE_LOG_SOURCE, message, data);
	}

	private errorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}
}
