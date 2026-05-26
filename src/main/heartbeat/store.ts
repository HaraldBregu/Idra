import Store from 'electron-store';
import type {
	AgentHeartbeatConfig,
	AgentsHeartbeatConfig,
	HeartbeatStoreState,
} from '../../shared/heartbeat';

const HEARTBEAT_STORE_VERSION = 1;
const CLEARABLE_HEARTBEAT_CONFIG_KEYS = [
	'activeHours',
	'providerId',
	'modelId',
	'model',
	'reasoningEffort',
] as const satisfies readonly (keyof AgentHeartbeatConfig)[];

interface HeartbeatStoreSchema {
	version?: 1;
	agents?: AgentsHeartbeatConfig;
	state?: HeartbeatStoreState;
}

interface HeartbeatStoreAccessor {
	get<TKey extends keyof HeartbeatStoreSchema>(key: TKey): HeartbeatStoreSchema[TKey];
	set<TKey extends keyof HeartbeatStoreSchema>(key: TKey, value: HeartbeatStoreSchema[TKey]): void;
}

export interface HeartbeatStoreLogger {
	debug(source: string, message: string, data?: unknown): void;
	info(source: string, message: string, data?: unknown): void;
	warn(source: string, message: string, data?: unknown): void;
	error(source: string, message: string, data?: unknown): void;
}

export interface HeartbeatFileStoreOptions {
	logger?: HeartbeatStoreLogger;
	store?: HeartbeatStoreAccessor;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
}

function readTrimmedString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeHeartbeatConfig(value: unknown): AgentHeartbeatConfig | undefined {
	const record = readRecord(value);
	if (!record) return undefined;
	return record as AgentHeartbeatConfig;
}

export function normalizeHeartbeatAgentsConfig(raw: unknown): AgentsHeartbeatConfig | undefined {
	const record = readRecord(raw);
	if (!record) return undefined;
	const defaultAgentId = readTrimmedString(record.defaultAgentId);
	const defaults = readRecord(record.defaults);
	const defaultHeartbeat = normalizeHeartbeatConfig(defaults?.heartbeat);
	const list = Array.isArray(record.list)
		? record.list.flatMap((entry) => {
				const agent = readRecord(entry);
				const id = readTrimmedString(agent?.id);
				if (!id) return [];
				const heartbeat = normalizeHeartbeatConfig(agent?.heartbeat);
				return [{ id, ...(heartbeat ? { heartbeat } : {}) }];
			})
		: undefined;
	const next: AgentsHeartbeatConfig = {
		...(defaultAgentId ? { defaultAgentId } : {}),
		...(defaultHeartbeat ? { defaults: { heartbeat: defaultHeartbeat } } : {}),
		...(list && list.length > 0 ? { list } : {}),
	};
	return Object.keys(next).length > 0 ? next : undefined;
}

export function emptyHeartbeatStoreState(): HeartbeatStoreState {
	return {
		version: 1,
		taskState: {},
		lastDelivered: {},
	};
}

export function migrateHeartbeatStoreState(raw: unknown): HeartbeatStoreState {
	if (!raw || typeof raw !== 'object') return emptyHeartbeatStoreState();
	const record = raw as Partial<HeartbeatStoreState>;
	return {
		version: 1,
		taskState: sanitizeRecord(record.taskState, (value) => {
			const lastRunMs = readFiniteNumber(value, 'lastRunMs');
			return lastRunMs === undefined ? undefined : { lastRunMs };
		}),
		lastDelivered: sanitizeRecord(record.lastDelivered, (value) => {
			const text = readString(value, 'text');
			const atMs = readFiniteNumber(value, 'atMs');
			return text && atMs !== undefined ? { text, atMs } : undefined;
		}),
	};
}

function sanitizeRecord<T>(
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

export class HeartbeatFileStore {
	private readonly store: HeartbeatStoreAccessor;
	private readonly logger?: HeartbeatStoreLogger;

	constructor(options: HeartbeatFileStoreOptions = {}) {
		this.logger = options.logger;
		this.store = options.store ?? (
			new Store<HeartbeatStoreSchema>({
				name: 'heartbeat',
				accessPropertiesByDotNotation: false,
			}) as unknown as HeartbeatStoreAccessor
		);
	}

	getAgentsConfig(): AgentsHeartbeatConfig | undefined {
		try {
			return normalizeHeartbeatAgentsConfig(this.store.get('agents'));
		} catch (error) {
			this.logger?.error('HeartbeatFileStore', 'Failed to read heartbeat config', error);
			throw error;
		}
	}

	setDefaultHeartbeatConfig(config: AgentHeartbeatConfig): AgentHeartbeatConfig {
		const currentAgents = this.getAgentsConfig() ?? {};
		const currentDefaults = currentAgents.defaults ?? {};
		const currentHeartbeat = currentDefaults.heartbeat ?? {};
		const nextHeartbeat: AgentHeartbeatConfig = {
			...currentHeartbeat,
			...config,
		};
		for (const key of CLEARABLE_HEARTBEAT_CONFIG_KEYS) {
			if (key in config && config[key] === undefined) {
				delete nextHeartbeat[key];
			}
		}
		const nextAgents: AgentsHeartbeatConfig = {
			...currentAgents,
			defaults: {
				...currentDefaults,
				heartbeat: nextHeartbeat,
			},
		};
		this.writeVersion();
		this.store.set('agents', nextAgents);
		return nextHeartbeat;
	}

	getHeartbeatState(): HeartbeatStoreState {
		try {
			return migrateHeartbeatStoreState(this.store.get('state'));
		} catch (error) {
			this.logger?.error('HeartbeatFileStore', 'Failed to read heartbeat state', error);
			throw error;
		}
	}

	setHeartbeatState(state: HeartbeatStoreState): void {
		try {
			this.writeVersion();
			this.store.set('state', migrateHeartbeatStoreState(state));
		} catch (error) {
			this.logger?.error('HeartbeatFileStore', 'Failed to persist heartbeat state', error);
			throw error;
		}
	}

	private writeVersion(): void {
		this.store.set('version', HEARTBEAT_STORE_VERSION);
	}
}
