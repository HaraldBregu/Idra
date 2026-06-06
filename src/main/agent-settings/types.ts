import type {
	AgentConfig,
	AgentRouteBinding,
	AgentRoutingSettings,
} from '../../shared/store';

export interface AgentSettingsStoreLogger {
	debug(source: string, message: string, data?: unknown): void;
	info(source: string, message: string, data?: unknown): void;
	warn(source: string, message: string, data?: unknown): void;
	error(source: string, message: string, data?: unknown): void;
}

export interface AgentSettingsStoreSchema {
	agents?: AgentConfig[];
	bindings?: AgentRouteBinding[];
}

export interface AgentSettingsStoreAccessor {
	get<TKey extends keyof AgentSettingsStoreSchema>(key: TKey): AgentSettingsStoreSchema[TKey];
	set<TKey extends keyof AgentSettingsStoreSchema>(
		key: TKey,
		value: AgentSettingsStoreSchema[TKey]
	): void;
}

export interface AgentSettingsStoreOptions {
	logger?: AgentSettingsStoreLogger;
	store?: AgentSettingsStoreAccessor;
}

export interface AgentSettingsStorePort {
	getAgentRoutingSettings(): AgentRoutingSettings;
	getConfiguredAgents(): AgentConfig[];
	getAgentConfig(id: string): AgentConfig | undefined;
	setAgentRoutingSettings(settings: unknown): AgentRoutingSettings;
}
