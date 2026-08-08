import type { McpData, McpSettings } from '../../shared/mcp_types';
import { getMcpServersState } from './mcp_store_state';

export function listConfiguredMcpServers(): McpSettings {
	const servers: McpSettings = {};
	for (const record of getMcpServersState()) {
		const { id, tokens: _tokens, codeVerifier: _verifier, ...data } = record;
		servers[id] = data as McpData;
	}
	return servers;
}
