import Store from 'electron-store';
import type { AgentConfig, AgentRouteBinding, AgentRoutingSettings } from '../../shared/store';
import { normalizeAgentRoutingSettings } from './orchestrator/routing';
import { resolveDefaultAgentDataPath } from './storage';

export interface AgentSettingsStoreLogger {
	error(source: string, message: string, data?: unknown): void;
}

interface AgentSettingsStoreSchema {
	agents?: AgentConfig[];
	bindings?: AgentRouteBinding[];
}

interface AgentSettingsStoreAccessor {
	get<TKey extends keyof AgentSettingsStoreSchema>(key: TKey): AgentSettingsStoreSchema[TKey];
	set<TKey extends keyof AgentSettingsStoreSchema>(key: TKey, value: AgentSettingsStoreSchema[TKey]): void;
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

export class AgentSettingsStore implements AgentSettingsStorePort {
	private readonly store: AgentSettingsStoreAccessor;

	constructor(options: AgentSettingsStoreOptions = {}) {
		this.store = options.store ?? new Store<AgentSettingsStoreSchema>({ name: 'agent', cwd: resolveDefaultAgentDataPath(), accessPropertiesByDotNotation: false }) as unknown as AgentSettingsStoreAccessor;
	}

	getAgentRoutingSettings(): AgentRoutingSettings {
		return normalizeAgentRoutingSettings({ agents: this.store.get('agents'), bindings: this.store.get('bindings') });
	}

	getConfiguredAgents(): AgentConfig[] {
		return this.getAgentRoutingSettings().agents;
	}

	getAgentConfig(id: string): AgentConfig | undefined {
		return this.getConfiguredAgents().find((agent) => agent.id === id);
	}

	setAgentRoutingSettings(settings: unknown): AgentRoutingSettings {
		const next = normalizeAgentRoutingSettings(settings);
		this.store.set('agents', next.agents);
		this.store.set('bindings', next.bindings);
		return next;
	}
}
