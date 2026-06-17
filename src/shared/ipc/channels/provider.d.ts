export declare const ProviderChannels: {
    readonly get: "provider-store:get";
    readonly set: "provider-store:set";
};
export declare const ProviderStoreChannels: {
    readonly get: "provider-store:get";
    readonly set: "provider-store:set";
};
export interface ProviderInvokeChannelMap {
    [ProviderChannels.get]: {
        args: [id: string];
        result: import('../../providers/types').Provider | undefined;
    };
    [ProviderChannels.set]: {
        args: [id: string, provider: import('../../providers/types').Provider];
        result: import('../../providers/types').Provider;
    };
}
export type ProviderStoreInvokeChannelMap = ProviderInvokeChannelMap;
