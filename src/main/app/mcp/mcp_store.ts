import path from 'node:path';
import Store from 'electron-store';
import type { McpData, McpSettings } from '../../../shared/mcp_types';
import { userDataLocation } from '../../shared/user_data_location';
import type { McpOAuthState, McpStoreSchema } from './mcp_types';

const MCP_STORE_NAME = 'settings.mcp';

const store = new Store<McpStoreSchema>({
	name: MCP_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'app'),
	accessPropertiesByDotNotation: false,
	defaults: {},
});

// ponytail: one-shot flatten of the old { servers, oauth } shape into id -> data + oauth
const legacy = store.store as {
	servers?: McpSettings;
	oauth?: Record<string, McpOAuthState>;
};
if (legacy.servers) {
	const flattened: McpStoreSchema = {};
	for (const [id, data] of Object.entries(legacy.servers)) {
		flattened[id] = { ...data, oauth: legacy.oauth?.[id] };
	}
	store.store = flattened;
}

export function getMcpServers(): McpSettings {
	const servers: McpSettings = {};
	for (const [id, { oauth: _oauth, ...data }] of Object.entries(store.store)) {
		servers[id] = data as McpData;
	}
	return servers;
}

export function setMcpServers(servers: McpSettings): void {
	const current = store.store;
	const next: McpStoreSchema = {};
	for (const [id, data] of Object.entries(servers)) {
		next[id] = { ...data, oauth: current[id]?.oauth };
	}
	store.store = next;
}

export function getMcpOauth(id: string): McpOAuthState {
	return store.store[id]?.oauth ?? {};
}

export function saveMcpOauth(id: string, state: McpOAuthState): void {
	const entry = store.store[id];
	if (!entry) throw new Error(`No MCP server "${id}".`);
	store.set(id, { ...entry, oauth: state });
}
