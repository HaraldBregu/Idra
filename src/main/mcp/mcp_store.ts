import type { McpData, McpSettings } from '../../shared/mcp_types';
import { getMcpServersState, setMcpServersState } from '../providers/providers_index';
import { splitRecord } from './mcp_split_record';
import type { McpOAuthState, McpRecord } from './mcp_types';

// tokens and the code verifier never leave the main process; the rest round-trips through the UI
export function getMcpServers(): McpSettings {
	const servers: McpSettings = {};
	for (const record of getMcpServersState()) {
		const { id, ...stored } = record;
		const { tokens: _tokens, codeVerifier: _verifier, ...data } = stored;
		servers[id] = data as McpData;
	}
	return servers;
}

export function setMcpServers(servers: McpSettings): void {
	const current = new Map(getMcpServersState().map((record) => [record.id, record]));
	const next: McpRecord[] = [];
	for (const [id, data] of Object.entries(servers)) {
		next.push({ ...current.get(id), id, ...data } as McpRecord);
	}
	setMcpServersState(next);
}

export function getMcpOauth(id: string): McpOAuthState {
	const record = getMcpServersState().find((entry) => entry.id === id);
	return record ? splitRecord(record).auth : {};
}

export function saveMcpOauth(id: string, state: McpOAuthState): void {
	const record = getMcpServersState().find((entry) => entry.id === id);
	if (!record) throw new Error(`No MCP server "${id}".`);
	setMcpServersState(
		getMcpServersState().map((entry) =>
			entry.id === id ? ({ id, ...splitRecord(entry).data, ...state } as McpRecord) : entry
		)
	);
}
