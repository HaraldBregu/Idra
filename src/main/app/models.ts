import path from 'node:path';
import { existsSync, readdirSync, readFileSync, watch } from 'node:fs';
import { is } from '@electron-toolkit/utils';
import {
	normalizeProviderId,
	type CatalogEntryModel,
	type CatalogEntryService,
	type CatalogService,
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
let watching = false;

/** Every model across resources/providers, each carrying the provider that serves it. */
export function loadModels(): readonly CatalogModel[] {
	// ponytail: without a watcher there is no safe cache — read fresh every call
	if (!watching) return readModels();
	if (!cache) cache = readModels();
	return cache;
}

/** Keep the catalog in sync with resources/providers; onChange fires after edits settle. */
export function watchModels(onChange: () => void): void {
	if (watching) return;
	try {
		let timer: NodeJS.Timeout | undefined;
		watch(providersDir(), { recursive: true }, () => {
			cache = undefined;
			clearTimeout(timer);
			timer = setTimeout(onChange, 100);
		});
		watching = true;
	} catch {
		// ponytail: watcher unavailable → loadModels() keeps reading fresh
	}
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
		...(entry.apiKeyUrl ? { apiKeyUrl: entry.apiKeyUrl } : {}),
	};
}

function providersDir(): string {
	return is.dev
		? path.join(__dirname, '../../resources/providers')
		: path.join(process.resourcesPath, 'resources/providers');
}

function readModels(): readonly CatalogModel[] {
	const dir = providersDir();

	return readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.flatMap((dirent) => {
			try {
				const providerPath = path.join(dir, dirent.name, 'info.json');
				const modelsPath = path.join(dir, dirent.name, 'models.json');
				if (!existsSync(providerPath) || !existsSync(modelsPath)) return [];
				const entry = JSON.parse(readFileSync(providerPath, 'utf-8')) as ProviderCatalogEntry;
				const models = JSON.parse(readFileSync(modelsPath, 'utf-8')) as CatalogEntryModel[];
				const provider = toPublicProvider(entry);
				return models.map((model) => ({ ...model, provider }));
			} catch {
				// ponytail: a provider dir mid-edit (malformed JSON) drops out until fixed
				return [];
			}
		});
}
