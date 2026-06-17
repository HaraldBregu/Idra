export declare const AgentChannels: {
    readonly send: "agent:send";
    readonly response: "agent:response";
    readonly cancel: "agent:cancel";
    readonly lastMessages: "agent:last-messages";
    readonly clearMessages: "agent:clear-messages";
    readonly getProvider: "agent:get-provider";
    readonly setProvider: "agent:set-provider";
    readonly getModelId: "agent:get-model-id";
    readonly setModelId: "agent:set-model-id";
};
export interface AgentInvokeChannelMap {
    [AgentChannels.send]: {
        args: [message: string, options?: Record<string, unknown>];
        result: string;
    };
    [AgentChannels.cancel]: {
        args: [];
        result: void;
    };
    [AgentChannels.lastMessages]: {
        args: [sessionId: string];
        result: import('../../agent/types').AgentHistoryMessage[];
    };
    [AgentChannels.clearMessages]: {
        args: [sessionId: string];
        result: void;
    };
    [AgentChannels.getProvider]: {
        args: [];
        result: import('../../providers').PublicProvider | undefined;
    };
    [AgentChannels.setProvider]: {
        args: [provider: import('../../providers').PublicProvider];
        result: boolean;
    };
    [AgentChannels.getModelId]: {
        args: [];
        result: string | undefined;
    };
    [AgentChannels.setModelId]: {
        args: [modelId: string];
        result: boolean;
    };
}
export interface AgentEventChannelMap {
    [AgentChannels.response]: {
        data: import('../../agent/types').AgentResponseEvent;
    };
}
