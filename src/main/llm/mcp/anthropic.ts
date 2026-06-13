import type { Messages as BetaMessages } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import type { ProviderMcpSpec } from '../types';

export interface AnthropicMcpConfig {
	tools: BetaMessages.BetaMCPToolset[];
	servers: BetaMessages.BetaRequestMCPServerURLDefinition[];
}

export function adaptAnthropicMcpServers(mcp: ProviderMcpSpec[] | undefined): AnthropicMcpConfig {
	const entries = (mcp ?? []).filter((entry) => entry.enabled !== false && !entry.connectorId);
	const servers: BetaMessages.BetaRequestMCPServerURLDefinition[] = [];
	const tools: BetaMessages.BetaMCPToolset[] = entries.map((entry) => ({
		type: 'mcp_toolset',
		mcp_server_name: entry.serverLabel,
		...(entry.deferLoading !== undefined
			? { default_config: { defer_loading: entry.deferLoading } }
			: {}),
	}));

	return { tools, servers };
}
