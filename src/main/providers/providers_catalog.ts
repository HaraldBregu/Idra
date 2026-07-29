import path from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { is } from '@electron-toolkit/utils';
import {
	normalizeProviderId,
	type Provider,
	type ProviderCatalogEntry,
} from '../../shared/provider_types';
import type { ModelCapability, ProviderModel, SpeechToTextApiType } from '../../shared/model_types';

let cache: readonly ProviderCatalogEntry[] | undefined;

/** Every provider/capability entry across resources/providers. */
export function loadProviderCatalog(): readonly ProviderCatalogEntry[] {
	if (!cache) cache = readCatalog();
	return cache;
}

/** One record per provider, deduplicated across its capability entries. */
export function loadProviders(): readonly Provider[] {
	const unique = new Map<string, Provider>();
	for (const entry of loadProviderCatalog()) {
		if (!unique.has(entry.id)) unique.set(entry.id, toProvider(entry));
	}
	return [...unique.values()];
}

export function providerEntry(
	providerId: string,
	type: ModelCapability
): ProviderCatalogEntry | undefined {
	const normalized = normalizeProviderId(providerId);
	return loadProviderCatalog().find((item) => item.id === normalized && item.type === type);
}

export function providerModels(providerId: string, type: ModelCapability): ProviderModel[] {
	return (providerEntry(providerId, type)?.models ?? []).map((model) => ({ ...model }));
}

export function providerIdsFor(type: ModelCapability): string[] {
	return loadProviderCatalog()
		.filter((entry) => entry.type === type)
		.map((entry) => entry.id);
}

export function supportsCapability(providerId: string, type: ModelCapability): boolean {
	return providerEntry(providerId, type) !== undefined;
}

/** Provider marked `default` for a capability, else the first one declaring it. */
export function defaultProviderId(type: ModelCapability): string | undefined {
	const entries = loadProviderCatalog().filter((entry) => entry.type === type);
	return (entries.find((entry) => entry.default) ?? entries[0])?.id;
}

export function speechToTextBaseUrl(providerId: string): string | undefined {
	return providerEntry(providerId, 'speech-to-text')?.baseUrl;
}

export function speechToTextSampleRate(providerId: string): number | undefined {
	return providerEntry(providerId, 'speech-to-text')?.sampleRate;
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
