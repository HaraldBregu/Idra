import type { Tool as ResponseTool } from 'openai/resources/responses/responses';
import type { ProviderMcpServerSpec } from '../types';

export function adaptOpenAIMcpServers(mcp: ProviderMcpServerSpec[] | undefined): ResponseTool[] {
	return (mcp ?? [])
		.filter((server) => server.enabled !== false)
		.map((server) => {
			if (!server.server_url && !server.connector_id) {
				throw new Error(
					`MCP server '${server.server_label}' requires server_url or connector_id.`
				);
			}

			return {
				type: 'mcp',
				server_label: server.server_label,
				...(server.connector_id ? { connector_id: server.connector_id } : {}),
				...(server.server_url ? { server_url: server.server_url } : {}),
				...(server.authorization ? { authorization: server.authorization } : {}),
				...(server.headers ? { headers: server.headers } : {}),
				...(server.require_approval ? { require_approval: server.require_approval } : {}),
				...(server.allowed_tools ? { allowed_tools: server.allowed_tools } : {}),
				...(server.defer_loading !== undefined ? { defer_loading: server.defer_loading } : {}),
				...(server.server_description ? { server_description: server.server_description } : {}),
			} as unknown as ResponseTool;
		});
}
