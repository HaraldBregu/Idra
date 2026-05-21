import {
	DEFAULT_AGENT_MODELS_BY_PROVIDER,
	DEFAULT_PROVIDERS,
	getDefaultAgentModels,
	providerHasCapability,
	type Provider,
} from './providers';
import {
	IMAGE_CREATOR_MODELS,
	SPEECH_TO_TEXT_MODELS,
	SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_SPEECH_PROVIDER_ID,
	getImageCreatorModels,
	getImageCreatorModelsForProvider,
	getSpeechToTextModels as getSpeechToTextModelsForProviderId,
	type Model,
	type ModelReasoningEffort,
} from './service';

export type { Model, ModelReasoningEffort };
export { IMAGE_CREATOR_MODELS as TEXT_TO_IMAGE_MODELS, SPEECH_TO_TEXT_MODELS, TEXT_TO_SPEECH_MODELS };

export type ModelCatalog = Readonly<Record<string, readonly Model[]>>;
export type ModelCapability = 'llm' | 'speech-to-text' | 'text-to-speech' | 'text-to-image';

export const LLM_MODELS_BY_PROVIDER: ModelCatalog = DEFAULT_AGENT_MODELS_BY_PROVIDER;
export const SPEECH_TO_TEXT_MODELS_BY_PROVIDER_CATALOG: ModelCatalog =
	SPEECH_TO_TEXT_MODELS_BY_PROVIDER;
export const TEXT_TO_SPEECH_MODELS_BY_PROVIDER: ModelCatalog = {
	[TEXT_TO_SPEECH_PROVIDER_ID]: TEXT_TO_SPEECH_MODELS,
};

export const TEXT_TO_IMAGE_MODELS_BY_PROVIDER: ModelCatalog = modelCatalogForProviderCapability(
	'Image',
	IMAGE_CREATOR_MODELS
);

export const MODEL_CATALOGS_BY_CAPABILITY = {
	llm: LLM_MODELS_BY_PROVIDER,
	speechToText: SPEECH_TO_TEXT_MODELS_BY_PROVIDER_CATALOG,
	textToSpeech: TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
	textToImage: TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
} as const satisfies Readonly<Record<string, ModelCatalog>>;

export function getLlmModels(providerId: string): Model[] {
	return getDefaultAgentModels(providerId);
}

export function getSpeechToTextModels(providerId: string): Model[] {
	return getSpeechToTextModelsForProviderId(providerId);
}

export function getTextToSpeechModels(providerId = TEXT_TO_SPEECH_PROVIDER_ID): Model[] {
	return cloneModels(TEXT_TO_SPEECH_MODELS_BY_PROVIDER[normalizeProviderId(providerId)]);
}

export function getTextToImageModels(providerId: string): Model[] {
	return getImageCreatorModels(providerId);
}

export function getTextToImageModelsForProvider(
	provider: Pick<Provider, 'id' | 'capabilities'>
): Model[] {
	return getImageCreatorModelsForProvider(provider);
}

export function getModelsByCapability(
	capability: ModelCapability,
	providerId: string
): Model[] {
	if (capability === 'llm') return getLlmModels(providerId);
	if (capability === 'speech-to-text') return getSpeechToTextModels(providerId);
	if (capability === 'text-to-speech') return getTextToSpeechModels(providerId);
	return getTextToImageModels(providerId);
}

function modelCatalogForProviderCapability(capability: string, models: readonly Model[]): ModelCatalog {
	return DEFAULT_PROVIDERS.reduce<Record<string, readonly Model[]>>((catalog, provider) => {
		if (providerHasCapability(provider, capability)) {
			catalog[provider.id] = models;
		}
		return catalog;
	}, {});
}

function cloneModels(models: readonly Model[] | undefined): Model[] {
	return (models ?? []).map((model) => ({ ...model }));
}

function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}
