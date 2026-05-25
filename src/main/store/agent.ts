import { normalizeAgentRoutingSettings } from '../agent/routing';
import type {
	AgentConfig,
	AgentRoutingSettings,
	TaskSettings,
	SettingsStoreAccessor,
} from '../../shared/store';

type KeepAwakeSettings = { readonly keepAwakeEnabled: boolean };

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
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

export class AgentStore {
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

	getTaskSettings(): TaskSettings {
		const task = this.store.get('task');
		return readTaskSettings(task === undefined ? this.store.get('backgroundTask') : task);
	}
}
