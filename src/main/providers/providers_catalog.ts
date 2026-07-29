import path from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { is } from '@electron-toolkit/utils';
import type { ProviderCatalogEntry, Provider } from '../../shared/providers_definitions';
import type { ModelCapability } from '../../shared/provider_models_definitions';
import type { ProviderModel } from '../../shared/provider_models_types';

let cache: readonly ProviderCatalogEntry[] | undefined;

/** Every provider/capability entry across resources/providers. */
export function loadProviderCatalog(): readonly ProviderCatalogEntry[] {
	if (!cache) cache = readCatalog();
	return cache;
}

/** One record per provider, deduplicated across its capability entries. */
export function loadProviders(): readonly Provider[] {
	const seen = new Map<string, Provider>();
	for (const entry of loadProviderCatalog()) {
		if (!seen.has(entry.id)) seen.set(entry.id, toProvider(entry));
	}
	return [...seen.values()];
}

export function providerModels(providerId: string, type: ModelCapability): ProviderModel[] {
	const entry = loadProviderCatalog().find(
		(item) => item.id === providerId && item.type === type
	);
	return (entry?.models ?? []).map((model) => ({ ...model }));
}

export function providerIdsFor(type: ModelCapability): string[] {
	return loadProviderCatalog()
		.filter((entry) => entry.type === type)
		.map((entry) => entry.id);
}

function toProvider(entry: ProviderCatalogEntry): Provider {
	return {
		id: entry.id,
		name: entry.name,
		baseUrl: entry.baseUrl,
		apiKey: entry.apiKey,
		...(entry.capabilities ? { capabilities: entry.capabilities } : {}),
		...(entry.apiConfiguration ? { apiConfiguration: entry.apiConfiguration } : {}),
	};
}

function readCatalog(): readonly ProviderCatalogEntry[] {
	const dir = is.dev
		? path.join(__dirname, '../../resources/providers')
		: path.join(process.resourcesPath, 'resources/providers');

	return readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(dir, entry.name, 'provider.json'))
		.filter((filePath) => existsSync(filePath))
		.flatMap((filePath) => JSON.parse(readFileSync(filePath, 'utf-8')) as ProviderCatalogEntry[]);
}
