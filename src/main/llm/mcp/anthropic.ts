import type { Messages as BetaMessages } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import type { ProviderMcpSpec } from '../types';

export interface AnthropicMcpConfig {
	tools: BetaMessages.BetaMCPToolset[];
	servers: BetaMessages.BetaRequestMCPServerURLDefinition[];
}

export function adaptAnthropicMcpServers(mcp: ProviderMcpSpec[] | undefined): AnthropicMcpConfig {
	const entries = (mcp ?? []).filter(
		(entry) => entry.enabled !== false && !entry.connectorId && entry.serverUrl
	);
	const servers = entries.map((entry): BetaMessages.BetaRequestMCPServerURLDefinition => ({
		type: 'url',
		name: entry.serverLabel,
		url: entry.serverUrl ?? '',
		...(entry.authorization ? { authorization_token: entry.authorization } : {}),
	}));
	const tools: BetaMessages.BetaMCPToolset[] = entries.map((entry) => {
		const defaultConfig: BetaMessages.BetaMCPToolDefaultConfig = {};
		if (entry.allowedTools !== undefined) defaultConfig.enabled = false;
		if (entry.deferLoading !== undefined) defaultConfig.defer_loading = entry.deferLoading;

		const configs = entry.allowedTools?.reduce<Record<string, BetaMessages.BetaMCPToolConfig>>(
			(acc, toolName) => {
				acc[toolName] = { enabled: true };
				return acc;
			},
			{}
		);

		return {
			type: 'mcp_toolset',
			mcp_server_name: entry.serverLabel,
			...(Object.keys(defaultConfig).length > 0 ? { default_config: defaultConfig } : {}),
			...(configs && Object.keys(configs).length > 0 ? { configs } : {}),
		};
	});

	return { tools, servers };
}
