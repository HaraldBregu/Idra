export declare const HeartbeatChannels: {
    readonly status: "heartbeat:status";
    readonly last: "heartbeat:last";
    readonly settings: "heartbeat:settings";
    readonly saveSettings: "heartbeat:save-settings";
    readonly setEnabled: "heartbeat:set-enabled";
    readonly getTiming: "heartbeat:get-timing";
    readonly updateTiming: "heartbeat:update-timing";
    readonly setProviderId: "heartbeat:set-provider-id";
    readonly setModelId: "heartbeat:set-model-id";
    readonly setReasoningEffort: "heartbeat:set-reasoning-effort";
    readonly systemEvent: "heartbeat:system-event";
    readonly request: "heartbeat:request";
    readonly event: "heartbeat:event";
};
export interface HeartbeatInvokeChannelMap {
    [HeartbeatChannels.status]: {
        args: [];
        result: unknown;
    };
    [HeartbeatChannels.last]: {
        args: [];
        result: unknown;
    };
    [HeartbeatChannels.settings]: {
        args: [];
        result: unknown;
    };
    [HeartbeatChannels.saveSettings]: {
        args: [request: unknown];
        result: unknown;
    };
    [HeartbeatChannels.setEnabled]: {
        args: [request: unknown];
        result: unknown;
    };
    [HeartbeatChannels.getTiming]: {
        args: [];
        result: unknown;
    };
    [HeartbeatChannels.updateTiming]: {
        args: [request: unknown];
        result: unknown;
    };
    [HeartbeatChannels.setProviderId]: {
        args: [request: unknown];
        result: unknown;
    };
    [HeartbeatChannels.setModelId]: {
        args: [request: unknown];
        result: unknown;
    };
    [HeartbeatChannels.setReasoningEffort]: {
        args: [request: unknown];
        result: unknown;
    };
    [HeartbeatChannels.systemEvent]: {
        args: [request: unknown];
        result: unknown;
    };
    [HeartbeatChannels.request]: {
        args: [request: unknown];
        result: void;
    };
}
export interface HeartbeatEventChannelMap {
    [HeartbeatChannels.event]: {
        data: unknown;
    };
}
