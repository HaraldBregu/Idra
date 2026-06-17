export declare const LLM_MODELS_BY_PROVIDER: {
    readonly anthropic: readonly [import("./types").ProviderModel, import("./types").ProviderModel, import("./types").ProviderModel];
    readonly deepseek: readonly [import("./types").ProviderModel, import("./types").ProviderModel];
    readonly google: readonly [import("./types").ProviderModel, import("./types").ProviderModel];
    readonly kimi: readonly [import("./types").ProviderModel, import("./types").ProviderModel, import("./types").ProviderModel];
    readonly meta: readonly [import("./types").ProviderModel, import("./types").ProviderModel, import("./types").ProviderModel];
    readonly minimax: readonly [import("./types").ProviderModel, import("./types").ProviderModel];
    readonly mistral: readonly [import("./types").ProviderModel, import("./types").ProviderModel, import("./types").ProviderModel];
    readonly openai: readonly [import("./types").ProviderModel, import("./types").ProviderModel, import("./types").ProviderModel];
    readonly qwen: readonly [import("./types").ProviderModel, import("./types").ProviderModel, import("./types").ProviderModel];
    readonly reka: readonly [import("./types").ProviderModel, import("./types").ProviderModel];
    readonly xai: readonly [import("./types").ProviderModel, import("./types").ProviderModel];
    readonly zai: readonly [import("./types").ProviderModel, import("./types").ProviderModel, import("./types").ProviderModel];
};
export declare const LLM_PROVIDERS: string[];
export declare const RESEARCH_CHAT_MODELS_BY_PROVIDER: {
    readonly perplexity: readonly [import("./types").ProviderModel, import("./types").ProviderModel, import("./types").ProviderModel, import("./types").ProviderModel];
};
export declare const CHAT_MODELS_BY_PROVIDER: Readonly<Record<string, readonly import("./types").ProviderModel[]>>;
