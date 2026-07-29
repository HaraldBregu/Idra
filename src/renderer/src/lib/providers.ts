import type { PublicProvider, PublicProviderCatalogEntry } from '@shared';
import type { ModelCapability } from '@shared/provider_models_definitions';
import type { ProviderModel } from '@shared/provider_models_types';

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
	const normalized = providerId.trim().toLowerCase();
	const entry = catalog.find((item) => item.id === normalized && item.type === type);
	return (entry?.models ?? []).map((model) => ({ ...model }));
}
