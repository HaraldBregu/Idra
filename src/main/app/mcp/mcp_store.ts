import path from 'node:path';
import Store from 'electron-store';
import type { McpData, McpSettings } from '../../../shared/mcp_types';
import { userDataLocation } from '../../shared/user_data_location';
import { splitRecord } from './mcp_split_record';
import type { McpOAuthState, McpRecord, McpStoreSchema } from './mcp_types';

const MCP_STORE_NAME = 'mcp';
const settingsDirectory = path.resolve(userDataLocation(), 'settings');

const store = new Store<McpStoreSchema>({
	name: MCP_STORE_NAME,
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: { servers: [] },
});

// tokens and the code verifier never leave the main process; the rest round-trips through the UI
export function getMcpServers(): McpSettings {
	const servers: McpSettings = {};
	for (const record of store.store.servers) {
		const { id, ...stored } = record;
		const { tokens: _tokens, codeVerifier: _verifier, ...data } = stored;
		servers[id] = data as McpData;
	}
	return servers;
}

export function setMcpServers(servers: McpSettings): void {
	const current = new Map(store.store.servers.map((record) => [record.id, record]));
	const next: McpRecord[] = [];
	for (const [id, data] of Object.entries(servers)) {
		next.push({ ...current.get(id), id, ...data } as McpRecord);
	}
	store.store = { servers: next };
}

export function getMcpOauth(id: string): McpOAuthState {
	const record = store.store.servers.find((entry) => entry.id === id);
	return record ? splitRecord(record).auth : {};
}

export function saveMcpOauth(id: string, state: McpOAuthState): void {
	const record = store.store.servers.find((entry) => entry.id === id);
	if (!record) throw new Error(`No MCP server "${id}".`);
	store.store = {
		servers: store.store.servers.map((entry) =>
			entry.id === id ? ({ id, ...splitRecord(entry).data, ...state } as McpRecord) : entry
		),
	};
}
