import { MODEL_CAPABILITIES } from './providers_models.definitions';

export type ProviderModelStatus = 'active' | 'deprecated' | 'verify';

export interface ProviderModel {
	readonly id: string;
	readonly name: string;
	readonly status: ProviderModelStatus;
}

export type ModelCatalog = Readonly<Record<string, readonly ProviderModel[]>>;

export type ModelCapability = (typeof MODEL_CAPABILITIES)[number];
