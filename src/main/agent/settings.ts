import Store from 'electron-store';
import type { AgentConfig, AgentRouteBinding, AgentRoutingSettings } from '../../shared/store';
import { normalizeAgentRoutingSettings } from './routing';
import { resolveDefaultAgentDataPath } from './storage';

export interface AgentSettingsStoreLogger {
	debug(source: string, message: string, data?: unknown): void;
	info(source: string, message: string, data?: unknown): void;
	warn(source: string, message: string, data?: unknown): void;
	error(source: string, message: string, data?: unknown): void;
}

interface AgentSettingsStoreSchema {
	agents?: AgentConfig[];
	bindings?: AgentRouteBinding[];
}

interface AgentSettingsStoreAccessor {
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

function createAgentSettingsStore(): AgentSettingsStoreAccessor {
	return new Store<AgentSettingsStoreSchema>({
		name: 'agent',
		cwd: resolveDefaultAgentDataPath(),
		accessPropertiesByDotNotation: false,
	}) as unknown as AgentSettingsStoreAccessor;
}

export class AgentSettingsStore implements AgentSettingsStorePort {
	private readonly logger?: AgentSettingsStoreLogger;
	private readonly store: AgentSettingsStoreAccessor;

	constructor(options: AgentSettingsStoreOptions = {}) {
		this.logger = options.logger;
		this.store = options.store ?? createAgentSettingsStore();
	}

	getAgentRoutingSettings(): AgentRoutingSettings {
		try {
			return normalizeAgentRoutingSettings({
				agents: this.store.get('agents'),
				bindings: this.store.get('bindings'),
			});
		} catch (error) {
			this.logger?.error('AgentSettingsStore', 'Failed to read agent settings', error);
			throw error;
		}
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
		try {
			this.store.set('agents', next.agents);
			this.store.set('bindings', next.bindings);
			return next;
		} catch (error) {
			this.logger?.error('AgentSettingsStore', 'Failed to write agent settings', error);
			throw error;
		}
	}
}
