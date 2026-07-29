import {
	normalizeProviderId,
	type PublicProvider,
	type PublicProviderCatalogEntry,
} from '@shared/provider_types';
import type { ModelCapability, ProviderModel, SpeechToTextApiType } from '@shared/model_types';

let catalog: readonly PublicProviderCatalogEntry[] = [];

export async function loadProviders(): Promise<void> {
	catalog = await window.app.providers();
}

export function providerCatalog(): readonly PublicProviderCatalogEntry[] {
	return catalog;
}

export function providers(): readonly PublicProvider[] {
	const unique = new Map<string, PublicProvider>();
	for (const entry of catalog) {
		if (unique.has(entry.id)) continue;
		unique.set(entry.id, {
			id: entry.id,
			name: entry.name,
			baseUrl: entry.baseUrl,
			...(entry.capabilities ? { capabilities: entry.capabilities } : {}),
			...(entry.apiConfiguration ? { apiConfiguration: entry.apiConfiguration } : {}),
		});
	}
	return [...unique.values()];
}

export function providerIdsFor(type: ModelCapability): string[] {
	return catalog.filter((entry) => entry.type === type).map((entry) => entry.id);
}

export function providerModels(providerId: string, type: ModelCapability): ProviderModel[] {
	const normalized = normalizeProviderId(providerId);
	const entry = catalog.find((item) => item.id === normalized && item.type === type);
	return (entry?.models ?? []).map((model) => ({ ...model }));
}

/** Provider marked `default` for a capability, else the first one declaring it. */
export function defaultProviderId(type: ModelCapability): string | undefined {
	const entries = catalog.filter((entry) => entry.type === type);
	return (entries.find((entry) => entry.default) ?? entries[0])?.id;
}

export function speechToTextApiTypes(
	providerId: string,
	modelId: string
): readonly SpeechToTextApiType[] {
	const model = providerModels(providerId, 'speech-to-text').find(
		(item) => item.id === modelId.trim()
	);
	return model?.apiTypes ?? [];
}

export function supportsSpeechToTextApiType(
	providerId: string,
	modelId: string,
	apiType: SpeechToTextApiType
): boolean {
	return speechToTextApiTypes(providerId, modelId).includes(apiType);
}

export function isRealtimeSpeechToTextModel(providerId: string, modelId: string): boolean {
	const model = providerModels(providerId, 'speech-to-text').find(
		(item) => item.id === modelId.trim()
	);
	return model?.realtime === true;
}
