import type { Messages as BetaMessages } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import type { ProviderMcpServerSpec, ProviderMcpToolSpec } from '../types';

export interface AnthropicMcpConfig {
	tools: BetaMessages.BetaMCPToolset[];
	servers: BetaMessages.BetaRequestMCPServerURLDefinition[];
}

export function adaptAnthropicMcpServers(
	mcpTools: ProviderMcpToolSpec[] | undefined,
	mcpServers: ProviderMcpServerSpec[] | undefined
): AnthropicMcpConfig {
	const toolsByServerLabel = new Map(
		(mcpTools ?? [])
			.filter((tool) => tool.enabled !== false)
			.map((tool) => [tool.server_label, tool])
	);

	const servers = (mcpServers ?? [])
		.filter((server) => server.enabled !== false)
		.map((server): BetaMessages.BetaRequestMCPServerURLDefinition => ({
			type: 'url',
			name: server.name,
			url: server.url,
			...(server.authorization_token
				? { authorization_token: server.authorization_token }
				: {}),
			...(server.allowed_tools
				? { tool_configuration: { allowed_tools: server.allowed_tools } }
				: {}),
		}));
	const tools = servers.map((server): BetaMessages.BetaMCPToolset => {
		const tool = toolsByServerLabel.get(server.name);

		return {
			type: 'mcp_toolset',
			mcp_server_name: server.name,
			...(tool?.defer_loading !== undefined
				? { default_config: { defer_loading: tool.defer_loading } }
				: {}),
		};
	});

	return { tools, servers };
}
