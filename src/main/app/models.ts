import path from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { is } from '@electron-toolkit/utils';
import {
	normalizeProviderId,
	type ProviderCatalogEntry,
	type PublicProvider,
} from '../../shared/provider_types';
import type {
	CatalogModel,
	ModelCapability,
	ProviderModel,
	SpeechToTextApiType,
} from '../../shared/model_types';

let cache: readonly CatalogModel[] | undefined;

/** Every model across resources/providers, each carrying the provider that serves it. */
export function loadModels(): readonly CatalogModel[] {
	if (!cache) cache = readModels();
	return cache;
}

export function modelsFor(type: ModelCapability): CatalogModel[] {
	return loadModels().filter((model) => model.type === type);
}

export function findModel(
	providerId: string,
	type: ModelCapability,
	modelId: string
): CatalogModel | undefined {
	const normalized = normalizeProviderId(providerId);
	const id = modelId.trim();
	return loadModels().find(
		(model) => model.provider.id === normalized && model.type === type && model.id === id
	);
}

/** One record per provider, derived from the models they serve. */
export function loadProviders(): readonly PublicProvider[] {
	const unique = new Map<string, PublicProvider>();
	for (const model of loadModels()) {
		if (!unique.has(model.provider.id)) unique.set(model.provider.id, model.provider);
	}
	return [...unique.values()];
}

export function providerModels(providerId: string, type: ModelCapability): ProviderModel[] {
	const normalized = normalizeProviderId(providerId);
	return loadModels()
		.filter((model) => model.provider.id === normalized && model.type === type)
		.map(toProviderModel);
}

export function providerIdsFor(type: ModelCapability): string[] {
	return [...new Set(modelsFor(type).map((model) => model.provider.id))];
}

export function supportsCapability(providerId: string, type: ModelCapability): boolean {
	const normalized = normalizeProviderId(providerId);
	return loadModels().some(
		(model) => model.provider.id === normalized && model.type === type
	);
}

/** Provider marked `default` for a capability, else the first one declaring it. */
export function defaultProviderId(type: ModelCapability): string | undefined {
	const models = modelsFor(type);
	return (models.find((model) => model.default) ?? models[0])?.provider.id;
}

export function speechToTextBaseUrl(providerId: string): string {
	const model = modelsFor('speech-to-text').find(
		(entry) => entry.provider.id === normalizeProviderId(providerId)
	);
	if (!model) throw new Error(`No speech-to-text entry for provider: ${providerId}`);
	return model.url ?? '';
}

export function speechToTextSampleRate(providerId: string): number | undefined {
	return modelsFor('speech-to-text').find(
		(entry) => entry.provider.id === normalizeProviderId(providerId)
	)?.sampleRate;
}

export function speechToTextApiTypes(
	providerId: string,
	modelId: string
): readonly SpeechToTextApiType[] {
	return findModel(providerId, 'speech-to-text', modelId)?.apiTypes ?? [];
}

export function supportsSpeechToTextApiType(
	providerId: string,
	modelId: string,
	apiType: SpeechToTextApiType
): boolean {
	return speechToTextApiTypes(providerId, modelId).includes(apiType);
}

export function realtimeSpeechToTextModelId(providerId: string): string {
	const normalized = normalizeProviderId(providerId);
	const model = modelsFor('speech-to-text').find(
		(entry) => entry.provider.id === normalized && entry.realtime
	);
	if (!model) throw new Error(`No realtime speech-to-text model for provider: ${providerId}`);
	return model.id;
}

export function isRealtimeSpeechToTextModel(providerId: string, modelId: string): boolean {
	return findModel(providerId, 'speech-to-text', modelId)?.realtime === true;
}

function toProviderModel(model: CatalogModel): ProviderModel {
	return {
		id: model.id,
		name: model.name,
		...(model.apiTypes ? { apiTypes: model.apiTypes } : {}),
		...(model.realtime ? { realtime: model.realtime } : {}),
	};
}

function toPublicProvider(entry: ProviderCatalogEntry): PublicProvider {
	// ponytail: catalog no longer carries connection details; the settings store does.
	return {
		id: entry.id,
		name: entry.name,
		baseUrl: '',
	};
}

function readModels(): readonly CatalogModel[] {
	const dir = is.dev
		? path.join(__dirname, '../../resources/providers')
		: path.join(process.resourcesPath, 'resources/providers');

	return readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(dir, entry.name, 'provider.json'))
		.filter((filePath) => existsSync(filePath))
		.flatMap((filePath) => JSON.parse(readFileSync(filePath, 'utf-8')) as ProviderCatalogEntry[])
		.flatMap((entry) => {
			const provider = toPublicProvider(entry);
			return (entry.models ?? []).map((model) => ({
				...model,
				provider,
				...(entry.sampleRate ? { sampleRate: entry.sampleRate } : {}),
				...(entry.default ? { default: entry.default } : {}),
			}));
		});
}
