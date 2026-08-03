import path from 'node:path';
import Store from 'electron-store';
import type { McpData, McpSettings } from '../../../shared/mcp_types';
import { userDataLocation } from '../../shared/user_data_location';
import type { McpOAuthState, McpRecord, McpStoreSchema } from './mcp_types';

const MCP_STORE_NAME = 'settings.mcp';

// ponytail: keys the OAuth flow owns; anything a server echoes back beyond these just lingers
const OAUTH_KEYS = [
	'redirect_uris',
	'grant_types',
	'response_types',
	'token_endpoint_auth_method',
	'client_name',
	'client_id',
	'client_secret',
	'client_id_issued_at',
	'client_secret_expires_at',
	'scope',
	'tokens',
	'codeVerifier',
] as const satisfies readonly (keyof McpOAuthState)[];

const store = new Store<McpStoreSchema>({
	name: MCP_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'app'),
	accessPropertiesByDotNotation: false,
	defaults: {},
});

// ponytail: one-shot flatten of the old { servers, oauth: { clientInformation } } shape
const legacy = store.store as {
	servers?: McpSettings;
	oauth?: Record<string, { clientInformation?: object; tokens?: object; codeVerifier?: string }>;
};
if (legacy.servers) {
	const flattened: McpStoreSchema = {};
	for (const [id, data] of Object.entries(legacy.servers)) {
		const { clientInformation, ...auth } = legacy.oauth?.[id] ?? {};
		flattened[id] = { ...data, ...clientInformation, ...auth } as McpRecord;
	}
	store.store = flattened;
}

function splitRecord(record: McpRecord): { data: McpData; auth: McpOAuthState } {
	const data = { ...record } as Record<string, unknown>;
	const auth: Record<string, unknown> = {};
	for (const key of OAUTH_KEYS) {
		if (key in data) auth[key] = data[key];
		delete data[key];
	}
	return { data: data as unknown as McpData, auth: auth as McpOAuthState };
}

// tokens and the code verifier never leave the main process; the rest round-trips through the UI
export function getMcpServers(): McpSettings {
	const servers: McpSettings = {};
	for (const [id, record] of Object.entries(store.store)) {
		const { tokens: _tokens, codeVerifier: _verifier, ...data } = record;
		servers[id] = data as McpData;
	}
	return servers;
}

export function setMcpServers(servers: McpSettings): void {
	const current = store.store;
	const next: McpStoreSchema = {};
	for (const [id, data] of Object.entries(servers)) {
		next[id] = { ...current[id], ...data };
	}
	store.store = next;
}

export function getMcpOauth(id: string): McpOAuthState {
	const record = store.store[id];
	return record ? splitRecord(record).auth : {};
}

export function saveMcpOauth(id: string, state: McpOAuthState): void {
	const record = store.store[id];
	if (!record) throw new Error(`No MCP server "${id}".`);
	store.set(id, { ...splitRecord(record).data, ...state });
}
