import type { McpServerConfig, McpServerInfo } from '../../mcp/types';

export const McpChannels = {
	listServers: 'mcp:list-servers',
	upsertServer: 'mcp:upsert-server',
	deleteServer: 'mcp:delete-server',
	status: 'mcp:status',
} as const;

export interface McpInvokeChannelMap {
	[McpChannels.listServers]: { args: []; result: McpServerConfig[] };
	[McpChannels.upsertServer]: { args: [config: McpServerConfig]; result: McpServerConfig };
	[McpChannels.deleteServer]: { args: [id: string]; result: void };
	[McpChannels.status]: { args: []; result: McpServerInfo[] };
}
