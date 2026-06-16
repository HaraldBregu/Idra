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
	reconnect: 'connectors:reconnect',
	status: 'connectors:status',
	authorizeOAuth: 'connectors:authorize-oauth',
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
	[ConnectorsChannels.reconnect]: { args: [name: string]; result: void };
	[ConnectorsChannels.status]: { args: []; result: import('../../mcp/types').McpServerInfo[] };
	[ConnectorsChannels.authorizeOAuth]: {
		args: [input: ConnectorOAuthDefaults];
		result: ConnectorOAuthAuthorizationResult;
	};
}
