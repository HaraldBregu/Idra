import type { ConnectorInput, ConnectorOAuthAuthorizationResult, ConnectorOAuthDefaults, ConnectorSettingsRecord } from '../../connector';
export declare const ConnectorsChannels: {
    readonly list: "connectors:list";
    readonly save: "connectors:save";
    readonly upsert: "connectors:upsert";
    readonly get: "connectors:get";
    readonly delete: "connectors:delete";
    readonly authorizeOAuth: "connectors:authorize-oauth";
};
export interface ConnectorsInvokeChannelMap {
    [ConnectorsChannels.list]: {
        args: [];
        result: ConnectorSettingsRecord;
    };
    [ConnectorsChannels.get]: {
        args: [id: string];
        result: ConnectorSettingsRecord;
    };
    [ConnectorsChannels.save]: {
        args: [input: ConnectorSettingsRecord];
        result: ConnectorSettingsRecord;
    };
    [ConnectorsChannels.upsert]: {
        args: [input: ConnectorInput];
        result: ConnectorSettingsRecord;
    };
    [ConnectorsChannels.delete]: {
        args: [id: string];
        result: void;
    };
    [ConnectorsChannels.authorizeOAuth]: {
        args: [input: ConnectorOAuthDefaults];
        result: ConnectorOAuthAuthorizationResult;
    };
}
