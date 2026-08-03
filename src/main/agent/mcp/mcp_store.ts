import path from 'node:path';
import Store from 'electron-store';
import type { McpSettings } from '../../../shared/mcp_types';
import { userDataLocation } from '../../shared/user_data_location';
import type { ConnectorStoreSchema, McpOAuthState } from './mcp_types';

export const DEFAULT_MCP_SETTINGS: ConnectorStoreSchema = { servers: {}, oauth: {} };

const MCP_STORE_NAME = 'settings.mcp';

const store = new Store<ConnectorStoreSchema>({
	name: MCP_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'agent'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_MCP_SETTINGS,
});

export function getMcpServers(): McpSettings {
	return store.store.servers ?? {};
}

export function setMcpServers(servers: McpSettings): void {
	store.set('servers', servers);
}

export function getMcpOauth(id: string): McpOAuthState {
	return store.store.oauth?.[id] ?? {};
}

export function saveMcpOauth(id: string, state: McpOAuthState): void {
	store.set('oauth', { ...(store.store.oauth ?? {}), [id]: state });
}
