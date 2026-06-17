export type ProviderModelStatus = 'active' | 'deprecated' | 'verify';
export interface ProviderModel {
    readonly id: string;
    readonly name: string;
    readonly status: ProviderModelStatus;
}
export type ModelCatalog = Readonly<Record<string, readonly ProviderModel[]>>;
export declare const MODEL_CAPABILITIES: readonly ["llm", "research-chat", "speech-to-text", "text-to-speech", "realtime-voice", "text-to-image", "text-to-audio", "music"];
export type ModelCapability = (typeof MODEL_CAPABILITIES)[number];
export declare function model(id: string, name: string, status?: ProviderModelStatus): ProviderModel;
export declare function mergeModelCatalogs(...catalogs: readonly ModelCatalog[]): ModelCatalog;
export declare function cloneModels(models: readonly ProviderModel[] | undefined): ProviderModel[];
export declare function normalizeProviderId(providerId: string): string;
