import type { CallToolResult, ListToolsResult } from '@modelcontextprotocol/sdk/types.js';
import type {
	ConnectorInput,
	ConnectorOAuthAuthorizationResult,
	ConnectorOAuthDefaults,
	ConnectorSettingsRecord,
} from '../../connector';

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
	[ConnectorsChannels.list]: { args: []; result: ConnectorSettingsRecord };
	[ConnectorsChannels.get]: { args: [id: string]; result: ConnectorSettingsRecord };
	[ConnectorsChannels.save]: {
		args: [input: ConnectorSettingsRecord];
		result: ConnectorSettingsRecord;
	};
	[ConnectorsChannels.upsert]: { args: [input: ConnectorInput]; result: ConnectorSettingsRecord };
	[ConnectorsChannels.delete]: { args: [id: string]; result: void };
	[ConnectorsChannels.authorizeOAuth]: {
		args: [input: ConnectorOAuthDefaults];
		result: ConnectorOAuthAuthorizationResult;
	};
}
