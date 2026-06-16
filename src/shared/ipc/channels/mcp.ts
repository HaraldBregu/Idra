import type { McpNamedEntry, McpServerInfo } from '../../mcp/types';

export const McpChannels = {
	listServers: 'mcp:list-servers',
	upsertServer: 'mcp:upsert-server',
	deleteServer: 'mcp:delete-server',
	status: 'mcp:status',
} as const;

export interface McpInvokeChannelMap {
	[McpChannels.listServers]: { args: []; result: McpNamedEntry[] };
	[McpChannels.upsertServer]: { args: [entry: McpNamedEntry]; result: void };
	[McpChannels.deleteServer]: { args: [name: string]; result: void };
	[McpChannels.status]: { args: []; result: McpServerInfo[] };
}
