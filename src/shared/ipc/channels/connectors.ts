export const ConnectorsChannels = {
	list: 'connectors:list',
	save: 'connectors:save',
	upsert: 'connectors:upsert',
	get: 'connectors:get',
} as const;

export interface ConnectorsInvokeChannelMap {
	[ConnectorsChannels.list]: { args: []; result: Record<string, unknown> };
	[ConnectorsChannels.get]: { args: [id: string]; result: Record<string, unknown> };
	[ConnectorsChannels.save]: { args: [input: unknown]; result: Record<string, unknown> };
	[ConnectorsChannels.upsert]: { args: [input: unknown]; result: Record<string, unknown> };
}
