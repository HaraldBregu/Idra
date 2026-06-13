import type { Tool as ResponseTool } from 'openai/resources/responses/responses';
import type { ProviderMcpServerSpec, ProviderMcpToolSpec } from '../types';

export function adaptOpenAIMcpTools(
	mcpTools: ProviderMcpToolSpec[] | undefined,
	mcpServers: ProviderMcpServerSpec[] | undefined
): ResponseTool[] {
	const serversByName = new Map(
		(mcpServers ?? [])
			.filter((server) => server.enabled !== false)
			.map((server) => [server.name, server])
	);

	return (mcpTools ?? [])
		.filter((tool) => tool.enabled !== false)
		.map((tool) => {
			const server = serversByName.get(tool.server_label);
			const serverUrl = tool.server_url ?? (tool.connector_id ? undefined : server?.url);
			const authorization = tool.authorization ?? server?.authorization_token;
			const allowedTools = tool.allowed_tools ?? server?.allowed_tools;

			if (!serverUrl && !tool.connector_id) {
				throw new Error(
					`MCP tool '${tool.server_label}' requires server_url or connector_id.`
				);
			}

			return {
				type: 'mcp',
				server_label: tool.server_label,
				...(tool.connector_id ? { connector_id: tool.connector_id } : {}),
				...(serverUrl ? { server_url: serverUrl } : {}),
				...(authorization ? { authorization } : {}),
				...(tool.headers ? { headers: tool.headers } : {}),
				...(tool.require_approval ? { require_approval: tool.require_approval } : {}),
				...(allowedTools ? { allowed_tools: allowedTools } : {}),
				...(tool.defer_loading !== undefined ? { defer_loading: tool.defer_loading } : {}),
				...(tool.server_description ? { server_description: tool.server_description } : {}),
			} as unknown as ResponseTool;
		});
}
