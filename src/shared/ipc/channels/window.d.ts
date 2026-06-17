export declare const WindowChannels: {
    readonly minimize: "window:minimize";
    readonly maximize: "window:maximize";
    readonly close: "window:close";
    readonly isMaximized: "window:is-maximized";
    readonly isFullScreen: "window:is-fullscreen";
    readonly maximizeChange: "window:maximize-change";
    readonly fullScreenChange: "window:fullscreen-change";
    readonly popupMenu: "window:popup-menu";
};
export interface WindowInvokeChannelMap {
    [WindowChannels.isMaximized]: {
        args: [];
        result: boolean;
    };
    [WindowChannels.isFullScreen]: {
        args: [];
        result: boolean;
    };
}
export interface WindowSendChannelMap {
    [WindowChannels.minimize]: {
        args: [];
    };
    [WindowChannels.maximize]: {
        args: [];
    };
    [WindowChannels.close]: {
        args: [];
    };
    [WindowChannels.popupMenu]: {
        args: [];
    };
}
export interface WindowEventChannelMap {
    [WindowChannels.maximizeChange]: {
        data: boolean;
    };
    [WindowChannels.fullScreenChange]: {
        data: boolean;
    };
}
