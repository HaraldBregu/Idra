import Store from 'electron-store';
import type { AgentConfig, AgentRoutingSettings } from '../../shared/store';
import { normalizeAgentRoutingSettings } from './planning';
import { resolveDefaultAgentDataPath } from './storage';
import type {
	AgentSettingsStoreAccessor,
	AgentSettingsStoreLogger,
	AgentSettingsStoreOptions,
	AgentSettingsStorePort,
	AgentSettingsStoreSchema,
} from './types';

export type {
	AgentSettingsStoreLogger,
	AgentSettingsStoreOptions,
	AgentSettingsStorePort,
} from './types';

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
