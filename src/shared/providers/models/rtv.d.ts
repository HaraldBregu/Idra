export declare const REALTIME_VOICE_MODELS_BY_PROVIDER: {
    readonly google: readonly [import("./types").ProviderModel];
    readonly luma: readonly [import("./types").ProviderModel];
    readonly qwen: readonly [import("./types").ProviderModel, import("./types").ProviderModel, import("./types").ProviderModel];
    readonly xai: readonly [import("./types").ProviderModel];
};
export declare function isRealtimeVoiceModel(providerId: string, modelId: string): boolean;
