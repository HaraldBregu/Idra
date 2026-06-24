import type { McpSettingsRecord } from '../../mcp';

export const McpChannels = {
	listServers: 'mcp:list-servers',
} as const;

export interface McpInvokeChannelMap {
	[McpChannels.listServers]: { args: []; result: McpSettingsRecord };
}
