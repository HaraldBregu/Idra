import type { ModelCatalog, ProviderModel, ProviderModelStatus } from './providers_models.types';

export const MODEL_CAPABILITIES = [
	'llm',
	'research-chat',
	'speech-to-text',
	'text-to-speech',
	'realtime-voice',
	'text-to-image',
	'text-to-audio',
	'music',
] as const;

export function model(
	id: string,
	name: string,
	status: ProviderModelStatus = 'active'
): ProviderModel {
	return { id, name, status };
}

export function mergeModelCatalogs(...catalogs: readonly ModelCatalog[]): ModelCatalog {
	return catalogs.reduce<Record<string, readonly ProviderModel[]>>((merged, catalog) => {
		for (const [providerId, models] of Object.entries(catalog)) {
			merged[providerId] = [...(merged[providerId] ?? []), ...models];
		}
		return merged;
	}, {});
}

export function cloneModels(models: readonly ProviderModel[] | undefined): ProviderModel[] {
	return (models ?? []).map((model) => ({ ...model }));
}

export function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}
