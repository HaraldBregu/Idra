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
		result: import('../../channels').ChannelCatalogEntry[];
	};
	[ChannelsChannels.getConfig]: {
		args: [];
		result: import('../../channels').Channel;
	};
	[ChannelsChannels.getChannelConfig]: {
		args: [type: import('../../channels').ChannelType];
		result: import('../../channels').Channel[import('../../channels').ChannelType];
	};
	[ChannelsChannels.saveChannelConfig]: {
		args: [
			type: import('../../channels').ChannelType,
			config: import('../../channels').Channel[import('../../channels').ChannelType],
		];
		result: import('../../channels').Channel[import('../../channels').ChannelType];
	};
	[ChannelsChannels.getStatus]: {
		args: [type?: import('../../channels').ChannelType];
		result: import('../../channels').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.getTelegramConfig]: {
		args: [];
		result: import('../../channels').TelegramChannelProperties;
	};
	[ChannelsChannels.saveTelegramConfig]: {
		args: [config: import('../../channels').TelegramChannelProperties];
		result: import('../../channels').TelegramChannelProperties;
	};
	[ChannelsChannels.getTelegramStatus]: {
		args: [];
		result: import('../../channels').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.startTelegram]: {
		args: [];
		result: import('../../channels').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.stopTelegram]: {
		args: [];
		result: void;
	};
	[ChannelsChannels.restartTelegram]: {
		args: [];
		result: import('../../channels').ChannelStatusEvent | undefined;
	};
}

export interface ChannelsEventChannelMap {
	[ChannelsChannels.statusChanged]: { data: import('../../channels').ChannelStatusEvent };
}
