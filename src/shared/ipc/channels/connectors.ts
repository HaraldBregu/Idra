import type { ConnectorInput, ConnectorSettingsRecord } from '../../connector';

export const ConnectorsChannels = {
	list: 'connectors:list',
	save: 'connectors:save',
	upsert: 'connectors:upsert',
	get: 'connectors:get',
} as const;

export interface ConnectorsInvokeChannelMap {
	[ConnectorsChannels.list]: { args: []; result: ConnectorSettingsRecord };
	[ConnectorsChannels.get]: { args: [id: string]; result: ConnectorSettingsRecord };
	[ConnectorsChannels.save]: {
		args: [input: ConnectorSettingsRecord];
		result: ConnectorSettingsRecord;
	};
	[ConnectorsChannels.upsert]: { args: [input: ConnectorInput]; result: ConnectorSettingsRecord };
}
