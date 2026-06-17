export declare const AppChannels: {
    readonly openAppDataFolder: "app:open-app-data-folder";
    readonly openExternalUrl: "app:open-external-url";
    readonly openSystemPreference: "app:open-system-preference";
    readonly setTrayEnabled: "app:set-tray-enabled";
    readonly getTrayEnabled: "app:get-tray-enabled";
    readonly getMicrophonePermission: "app:get-microphone-permission";
    readonly setMicrophoneEnabled: "app:set-microphone-enabled";
    readonly requestMicrophonePermission: "app:request-microphone-permission";
    readonly getCameraPermission: "app:get-camera-permission";
    readonly setCameraEnabled: "app:set-camera-enabled";
    readonly requestCameraPermission: "app:request-camera-permission";
};
export interface AppInvokeChannelMap {
    [AppChannels.openAppDataFolder]: {
        args: [];
        result: void;
    };
    [AppChannels.openExternalUrl]: {
        args: [url: string];
        result: void;
    };
    [AppChannels.setTrayEnabled]: {
        args: [enabled: boolean];
        result: void;
    };
    [AppChannels.getTrayEnabled]: {
        args: [];
        result: boolean;
    };
    [AppChannels.getMicrophonePermission]: {
        args: [];
        result: import('../../app/app-permissions').MicrophonePermissionSettings;
    };
    [AppChannels.setMicrophoneEnabled]: {
        args: [enabled: boolean];
        result: import('../../app/app-permissions').MicrophonePermissionSettings;
    };
    [AppChannels.requestMicrophonePermission]: {
        args: [];
        result: import('../../app/app-permissions').MicrophonePermissionSettings;
    };
    [AppChannels.openSystemPreference]: {
        args: [pane: import('../../app/app-permissions').SystemPreferencePaneId];
        result: void;
    };
    [AppChannels.getCameraPermission]: {
        args: [];
        result: import('../../app/app-permissions').CameraPermissionSettings;
    };
    [AppChannels.setCameraEnabled]: {
        args: [enabled: boolean];
        result: import('../../app/app-permissions').CameraPermissionSettings;
    };
    [AppChannels.requestCameraPermission]: {
        args: [];
        result: import('../../app/app-permissions').CameraPermissionSettings;
    };
}
