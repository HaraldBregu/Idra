import { normalizeAgentRoutingSettings } from '../agent/routing';
import type { AgentConfig, AgentRoutingSettings, SettingsStoreAccessor } from '../../shared/store';

type KeepAwakeSettings = { readonly keepAwakeEnabled: boolean };

export class AgentsStore {
	private store: SettingsStoreAccessor;
	private keepAwakeEnabled = false;

	constructor(store: SettingsStoreAccessor) {
		this.store = store;
	}

	getKeepAwakeEnabled(): boolean {
		return this.keepAwakeEnabled;
	}

	setKeepAwakeEnabled(enabled: boolean): KeepAwakeSettings {
		this.keepAwakeEnabled = enabled;
		return { keepAwakeEnabled: enabled };
	}

	getAgentRoutingSettings(): AgentRoutingSettings {
		return normalizeAgentRoutingSettings(this.store.get('agents'));
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
		this.store.set('agents', next);
		return next;
	}
}
