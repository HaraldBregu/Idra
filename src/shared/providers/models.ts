export type ProviderModelStatus = 'active' | 'deprecated' | 'verify';

export interface ProviderModel {
	readonly id: string;
	readonly name: string;
	readonly status: ProviderModelStatus;
}

export type ModelCatalog = Readonly<Record<string, readonly ProviderModel[]>>;

export const MODEL_CAPABILITIES = [
	'llm',
	'research-chat',
	'speech-to-text',
	'text-to-speech',
	'realtime-voice',
	'text-to-image',
	'text-to-video',
	'text-to-audio',
	'music',
	'3d',
	'embedding',
] as const;

export type ModelCapability = (typeof MODEL_CAPABILITIES)[number];

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
