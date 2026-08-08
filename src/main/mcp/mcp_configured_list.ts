import type { McpData, McpSettings } from '../../shared/mcp_types';
import { getMcpServersState } from './mcp_store_state';

export function listConfiguredMcpServers(): McpSettings {
	const servers: McpSettings = {};
	for (const record of getMcpServersState()) {
		const {
			id,
			token: _token,
			client_secret: _clientSecret,
			refresh_token: _refreshToken,
			tokens: _tokens,
			codeVerifier: _verifier,
			...data
		} = record;
		servers[id] = data as McpData;
	}
	return servers;
}
