import type { McpData, McpRegistry, McpServerInfo } from '../../shared/mcp_types';
import { getMcpServersState } from '../providers/providers_index';
import { listLocalMcpServers } from './mcp_local_list';

export function listMcpRegistry(): McpRegistry {
	const local = listLocalMcpServers();
	const configured = new Map<string, McpServerInfo>();
	for (const record of getMcpServersState()) {
		const { id, tokens: _tokens, codeVerifier: _verifier, ...data } = record;
		configured.set(id, { id, source: 'configured', data: data as McpData });
	}
	for (const server of local.servers) {
		const collision = configured.get(server.id);
		if (collision) {
			configured.set(server.id, {
				...collision,
				diagnostic: `Local server at ${server.path ?? server.id} is ignored because a configured server uses the same ID.`,
			});
			continue;
		}
		configured.set(server.id, server);
	}
	return {
		servers: [...configured.values()].sort((a, b) => a.id.localeCompare(b.id)),
		diagnostics: local.diagnostics,
	};
}
