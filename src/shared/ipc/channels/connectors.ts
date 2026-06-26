import type { McpOAuthStart, McpSettings } from '../../mcp';

export const ConnectorsChannels = {
	list: 'connectors:list',
	get: 'connectors:get',
	save: 'connectors:save',
	delete: 'connectors:delete',
	oauthStart: 'connectors:oauth:start',
	oauthFinish: 'connectors:oauth:finish',
} as const;

export interface ConnectorsInvokeChannelMap {
	[ConnectorsChannels.list]: { args: []; result: McpSettings };
	[ConnectorsChannels.get]: { args: [id: string]; result: McpSettings };
	[ConnectorsChannels.save]: { args: [input: McpSettings]; result: McpSettings };
	[ConnectorsChannels.delete]: { args: [id: string]; result: void };
	[ConnectorsChannels.oauthStart]: { args: [id: string]; result: McpOAuthStart };
	[ConnectorsChannels.oauthFinish]: { args: [id: string, code: string]; result: void };
}
