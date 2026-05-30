import Store from 'electron-store';
import { resolveDefaultAgentDataPath } from '../storage';

export interface AgentPermissions {
	allow: string[];
	deny: string[];
	ask: string[];
}

export interface AgentSettingsFileSchema {
	permissions: AgentPermissions;
}

export const DEFAULT_AGENT_PERMISSIONS: AgentPermissions = {
	allow: [],
	deny: [],
	ask: [],
};

export interface AgentPermissionsStoreLogger {
	debug(source: string, message: string, data?: unknown): void;
	warn(source: string, message: string, data?: unknown): void;
	error(source: string, message: string, data?: unknown): void;
}

interface AgentSettingsStoreAccessor {
	get<TKey extends keyof AgentSettingsFileSchema>(key: TKey): AgentSettingsFileSchema[TKey] | undefined;
	set<TKey extends keyof AgentSettingsFileSchema>(key: TKey, value: AgentSettingsFileSchema[TKey]): void;
	has(key: keyof AgentSettingsFileSchema): boolean;
}

export interface AgentPermissionsStoreOptions {
	logger?: AgentPermissionsStoreLogger;
	store?: AgentSettingsStoreAccessor;
}

export interface AgentPermissionsStorePort {
	getPermissions(): AgentPermissions;
}

function createSettingsStore(): AgentSettingsStoreAccessor {
	return new Store<AgentSettingsFileSchema>({
		name: 'settings',
		cwd: resolveDefaultAgentDataPath(),
		accessPropertiesByDotNotation: false,
	}) as unknown as AgentSettingsStoreAccessor;
}

export class AgentPermissionsStore implements AgentPermissionsStorePort {
	private readonly logger?: AgentPermissionsStoreLogger;
	private readonly store: AgentSettingsStoreAccessor;

	constructor(options: AgentPermissionsStoreOptions = {}) {
		this.logger = options.logger;
		this.store = options.store ?? createSettingsStore();
		this.ensure();
	}

	getPermissions(): AgentPermissions {
		return this.store.get('permissions') ?? { ...DEFAULT_AGENT_PERMISSIONS };
	}

	private ensure(): void {
		try {
			if (this.store.has('permissions')) return;
			this.store.set('permissions', { ...DEFAULT_AGENT_PERMISSIONS });
			this.logger?.debug('AgentPermissionsStore', 'Created default agent settings.json');
		} catch (error) {
			this.logger?.error('AgentPermissionsStore', 'Failed to ensure agent settings.json', error);
			throw error;
		}
	}
}
