import path from 'node:path';
import { app } from 'electron';
import Store from 'electron-store';
import type { McpSettingsRecord } from '../../shared/mcp';

type ConnectorStoreSchema = { mcpServers: McpSettingsRecord };

const DEFAULT_SETTINGS: ConnectorStoreSchema = { mcpServers: {} };

export class ConnectorStore {
	private readonly store: Store<ConnectorStoreSchema>;

	constructor(cwd?: string) {
		this.store = new Store<ConnectorStoreSchema>({
			name: 'settings',
			cwd: cwd ?? resolveConnectorSettingsLocation(),
			accessPropertiesByDotNotation: false,
			defaults: DEFAULT_SETTINGS,
		});
	}

	servers(): McpSettingsRecord {
		return this.store.store.mcpServers ?? {};
	}

	write(servers: McpSettingsRecord): void {
		this.store.store = { mcpServers: servers };
	}
}

export function resolveConnectorSettingsLocation(): string {
	try {
		return path.join(app.getPath('appData'), app.getName(), 'mcp');
	} catch {
		const base =
			process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, app?.getName?.() ?? 'Friday', 'connectors');
	}
}
