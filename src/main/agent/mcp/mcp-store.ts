import path from 'node:path';
import Store from 'electron-store';
import type { McpSettings } from '../../../shared/mcp';
import { agentLocation } from '../shared/agent-location';
import type { ConnectorStoreSchema, McpOAuthState } from './mcp-types';

export const DEFAULT_MCP_SETTINGS: ConnectorStoreSchema = { mcpServers: {}, oauth: {} };

const MCP_STORE_NAME = 'mcp';

const store = new Store<ConnectorStoreSchema>({
	name: MCP_STORE_NAME,
	cwd: path.resolve(agentLocation()),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_MCP_SETTINGS,
});

export function getMcpServers(): McpSettings {
	return store.store.mcpServers ?? {};
}

export function setMcpServers(servers: McpSettings): void {
	store.set('mcpServers', servers);
}

export function getMcpOauth(id: string): McpOAuthState {
	return store.store.oauth?.[id] ?? {};
}

export function saveMcpOauth(id: string, state: McpOAuthState): void {
	store.set('oauth', { ...(store.store.oauth ?? {}), [id]: state });
}
