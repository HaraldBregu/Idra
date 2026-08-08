import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';
import { MISC } from 'node:readline';
import { isObject } from 'node:util/types';
import type { McpRecord, McpStoreSchema } from './mcp_types';

type LegacyProvidersState = {
	mcp_servers?: unknown;
};

const settingsDirectory = path.resolve(userDataLocation(), 'settings');

const legacyStore = new Store<LegacyProvidersState>({
	name: 'providers',
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
});

const store = new Store<McpStoreSchema>({
	name: 'mcp',
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: { servers: [] },
});

function isMcpRecord(value: unknown): value is McpRecord {
	if (!isObject(value) || value === null) return false;
	const record = value as Record<string, unknown>;
	return typeof record.id === 'string' && typeof record.type === 'string';
}

function isMcpRecordArray(value: unknown): value is McpRecord[] {
	return Array.isArray(value) && value.every(isMcpRecord);
}

function migrateLegacyMcpServers(): void {
	const legacyServers = legacyStore.get('mcp_servers');
	const hasLegacyServers = isMcpRecordArray(legacyServers);
	const migrated = getMcpServersState();
	if (migrated.length === 0 && hasLegacyServers) {
		setMcpServersState(legacyServers);
	}

	if (legacyStore.has('mcp_servers')) {
		legacyStore.delete('mcp_servers');
	}
}

export const mcpStorePath = store.path;

export function getMcpServersState(): McpRecord[] {
	return store.get('servers');
}

export function setMcpServersState(value: McpRecord[]): void {
	store.set('servers', value);
}

export function migrateMcpStoreFromProviders(): void {
	migrateLegacyMcpServers();
}
