import type { ConnectorSettingsRecord } from '../../connector';

export const McpChannels = {
	listServers: 'mcp:list-servers',
} as const;

export interface McpInvokeChannelMap {
	[McpChannels.listServers]: { args: []; result: ConnectorSettingsRecord };
}
