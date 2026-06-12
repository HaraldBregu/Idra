import type { Messages as BetaMessages } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import type { ProviderMcpServerSpec } from '../types';

export interface AnthropicMcpConfig {
	tools: BetaMessages.BetaMCPToolset[];
	servers: BetaMessages.BetaRequestMCPServerURLDefinition[];
}

export function adaptAnthropicMcpServers(
	mcp: ProviderMcpServerSpec[] | undefined
): AnthropicMcpConfig {
	const tools: BetaMessages.BetaMCPToolset[] = [];
	const servers: BetaMessages.BetaRequestMCPServerURLDefinition[] = [];

	for (const server of mcp ?? []) {
		if (server.enabled === false) continue;
		if (!server.server_url) {
			throw new Error(`MCP server '${server.server_label}' requires server_url for Anthropic.`);
		}

		servers.push({
			type: 'url',
			name: server.server_label,
			url: server.server_url,
			...(server.authorization ? { authorization_token: server.authorization } : {}),
			...(server.allowed_tools
				? { tool_configuration: { allowed_tools: server.allowed_tools } }
				: {}),
		});
		tools.push({
			type: 'mcp_toolset',
			mcp_server_name: server.server_label,
			...(server.defer_loading !== undefined
				? { default_config: { defer_loading: server.defer_loading } }
				: {}),
		});
	}

	return { tools, servers };
}
