import path from 'node:path';
import Store from 'electron-store';
import type { McpData, McpSettings } from '../../../shared/mcp_types';
import { userDataLocation } from '../../shared/user_data_location';
import { splitRecord } from './mcp_split_record';
import type { McpOAuthState, McpRecord, McpStoreSchema } from './mcp_types';

const MCP_STORE_NAME = 'providers.mcp';
const LEGACY_MCP_STORE_NAME = 'settings.mcp';

const store = new Store<McpStoreSchema>({
	name: MCP_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'app'),
	accessPropertiesByDotNotation: false,
	defaults: [],
});

const legacyStore = new Store<Record<string, LegacyEntry>>({
	name: LEGACY_MCP_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'app'),
	accessPropertiesByDotNotation: false,
	defaults: {},
});

type LegacyOAuth = { clientInformation?: object; tokens?: object; codeVerifier?: string };
type LegacyEntry = McpData & { oauth?: LegacyOAuth };

// ponytail: one-shot flatten of the earlier { servers, oauth } and { id: { oauth } } shapes
const legacy = legacyStore.store as Record<string, LegacyEntry> & {
	servers?: Record<string, LegacyEntry>;
	oauth?: Record<string, LegacyOAuth>;
};
const legacyServers = legacy.servers;
const entries = legacyServers ?? legacy;
if (store.store.length === 0) {
	const migrated: McpStoreSchema = [];
	for (const [id, rawEntry] of Object.entries(entries)) {
		if (id === 'oauth' || id === 'servers') continue;
		const { oauth, ...data } = rawEntry;
		const { clientInformation, ...auth } = oauth ?? legacy.oauth?.[id] ?? {};
		migrated.push({ id, ...data, ...clientInformation, ...auth } as McpRecord);
	}
	if (migrated.length > 0) {
		store.store = migrated;
		legacyStore.clear();
	}
}

// tokens and the code verifier never leave the main process; the rest round-trips through the UI
export function getMcpServers(): McpSettings {
	const servers: McpSettings = {};
	for (const record of store.store) {
		const { id, ...stored } = record;
		const { tokens: _tokens, codeVerifier: _verifier, ...data } = stored;
		servers[id] = data as McpData;
	}
	return servers;
}

export function setMcpServers(servers: McpSettings): void {
	const current = new Map(store.store.map((record) => [record.id, record]));
	const next: McpStoreSchema = [];
	for (const [id, data] of Object.entries(servers)) {
		next.push({ ...current.get(id), id, ...data } as McpRecord);
	}
	store.store = next;
}

export function getMcpOauth(id: string): McpOAuthState {
	const record = store.store.find((entry) => entry.id === id);
	return record ? splitRecord(record).auth : {};
}

export function saveMcpOauth(id: string, state: McpOAuthState): void {
	const record = store.store.find((entry) => entry.id === id);
	if (!record) throw new Error(`No MCP server "${id}".`);
	store.store = store.store.map((entry) =>
		entry.id === id ? ({ id, ...splitRecord(entry).data, ...state } as McpRecord) : entry
	);
}
