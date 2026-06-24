import type { CallToolResult, ListToolsResult } from '@modelcontextprotocol/sdk/types.js';
import type {
	McpInput,
	McpOAuthAuthorizationResult,
	McpOAuthDefaults,
	McpSettingsRecord,
} from '../../mcp';

export const ConnectorsChannels = {
	list: 'connectors:list',
	save: 'connectors:save',
	upsert: 'connectors:upsert',
	get: 'connectors:get',
	delete: 'connectors:delete',
	authorizeOAuth: 'connectors:authorize-oauth',
	listTools: 'connectors:list-tools',
	callTool: 'connectors:call-tool',
	disconnect: 'connectors:disconnect',
} as const;

export interface ConnectorsInvokeChannelMap {
	[ConnectorsChannels.list]: { args: []; result: McpSettingsRecord };
	[ConnectorsChannels.get]: { args: [id: string]; result: McpSettingsRecord };
	[ConnectorsChannels.save]: {
		args: [input: McpSettingsRecord];
		result: McpSettingsRecord;
	};
	[ConnectorsChannels.upsert]: { args: [input: McpInput]; result: McpSettingsRecord };
	[ConnectorsChannels.delete]: { args: [id: string]; result: void };
	[ConnectorsChannels.authorizeOAuth]: {
		args: [input: McpOAuthDefaults];
		result: McpOAuthAuthorizationResult;
	};
	[ConnectorsChannels.listTools]: { args: [id: string]; result: ListToolsResult };
	[ConnectorsChannels.callTool]: {
		args: [id: string, name: string, args?: Record<string, unknown>];
		result: CallToolResult;
	};
	[ConnectorsChannels.disconnect]: { args: [id: string]; result: void };
}
