export const ChannelsChannels = {
	listCatalog: 'channels:catalog',
	getConfig: 'channels:get-config',
	getChannelConfig: 'channels:get-channel-config',
	saveChannelConfig: 'channels:save-channel-config',
	getStatus: 'channels:get-status',
	getTelegramConfig: 'channels:telegram:get-config',
	saveTelegramConfig: 'channels:telegram:save-config',
	getTelegramStatus: 'channels:telegram:get-status',
	startTelegram: 'channels:telegram:start',
	stopTelegram: 'channels:telegram:stop',
	restartTelegram: 'channels:telegram:restart',
	statusChanged: 'channels:status-changed',
} as const;

export interface ChannelsInvokeChannelMap {
	[ChannelsChannels.listCatalog]: {
		args: [];
		result: import('./channels.types').ChannelCatalogEntry[];
	};
	[ChannelsChannels.getConfig]: {
		args: [];
		result: import('./channels_definitions').Channel;
	};
	[ChannelsChannels.getChannelConfig]: {
		args: [type: import('./channels_definitions').ChannelType];
		result: import('./channels_definitions').Channel[import('./channels_definitions').ChannelType];
	};
	[ChannelsChannels.saveChannelConfig]: {
		args: [
			type: import('./channels_definitions').ChannelType,
			config: import('./channels_definitions').Channel[import('./channels_definitions').ChannelType],
		];
		result: import('./channels_definitions').Channel[import('./channels_definitions').ChannelType];
	};
	[ChannelsChannels.getStatus]: {
		args: [type?: import('./channels_definitions').ChannelType];
		result: import('./channels_definitions').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.getTelegramConfig]: {
		args: [];
		result: import('./channels_definitions').TelegramChannelProperties;
	};
	[ChannelsChannels.saveTelegramConfig]: {
		args: [config: import('./channels_definitions').TelegramChannelProperties];
		result: import('./channels_definitions').TelegramChannelProperties;
	};
	[ChannelsChannels.getTelegramStatus]: {
		args: [];
		result: import('./channels_definitions').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.startTelegram]: {
		args: [];
		result: import('./channels_definitions').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.stopTelegram]: {
		args: [];
		result: void;
	};
	[ChannelsChannels.restartTelegram]: {
		args: [];
		result: import('./channels_definitions').ChannelStatusEvent | undefined;
	};
}

export interface ChannelsEventChannelMap {
	[ChannelsChannels.statusChanged]: { data: import('./channels_definitions').ChannelStatusEvent };
}
