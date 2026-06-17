export declare const ChannelsChannels: {
    readonly listCatalog: "channels:catalog";
    readonly getConfig: "channels:get-config";
    readonly getChannelConfig: "channels:get-channel-config";
    readonly saveChannelConfig: "channels:save-channel-config";
    readonly getStatus: "channels:get-status";
    readonly getTelegramConfig: "channels:telegram:get-config";
    readonly saveTelegramConfig: "channels:telegram:save-config";
    readonly getTelegramStatus: "channels:telegram:get-status";
    readonly startTelegram: "channels:telegram:start";
    readonly stopTelegram: "channels:telegram:stop";
    readonly restartTelegram: "channels:telegram:restart";
    readonly statusChanged: "channels:status-changed";
};
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
            config: import('../../channels').Channel[import('../../channels').ChannelType]
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
    [ChannelsChannels.statusChanged]: {
        data: import('../../channels').ChannelStatusEvent;
    };
}
