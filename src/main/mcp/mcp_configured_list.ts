import type { McpData, McpSettings } from '../../shared/mcp_types';
import { getMcpServersState } from '../providers/providers_index';

export function listConfiguredMcpServers(): McpSettings {
	const servers: McpSettings = {};
	for (const record of getMcpServersState()) {
		const { id, tokens: _tokens, codeVerifier: _verifier, ...data } = record;
		servers[id] = data as McpData;
	}
	return servers;
}
