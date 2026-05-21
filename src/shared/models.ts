import {
	getImageCreatorModels,
	getImageCreatorModelsForProvider,
	getSpeechToTextModels as getSpeechToTextModelsForProviderId,
	type Model,
	type ModelReasoningEffort,
} from './service';
import type { Provider } from './providers';
import {
	LLM_MODELS_BY_PROVIDER,
	MODEL_CATALOGS_BY_CAPABILITY,
	IMAGE_CREATOR_MODELS as TEXT_TO_IMAGE_MODELS,
	SPEECH_TO_TEXT_MODELS,
	SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
	TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_PROVIDER_ID,
	type ModelCapability,
	type ModelCatalog,
} from './provider-models';

export type { Model, ModelReasoningEffort };
export {
	LLM_MODELS_BY_PROVIDER,
	MODEL_CATALOGS_BY_CAPABILITY,
	SPEECH_TO_TEXT_MODELS,
	SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
	TEXT_TO_IMAGE_MODELS,
	TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
};

export type { ModelCapability, ModelCatalog };

export function getLlmModels(providerId: string): Model[] {
	return cloneModels(LLM_MODELS_BY_PROVIDER[normalizeProviderId(providerId)]);
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

export function getModelsByCapability(capability: ModelCapability, providerId: string): Model[] {
	if (capability === 'llm') return getLlmModels(providerId);
	if (capability === 'speech-to-text') return getSpeechToTextModels(providerId);
	if (capability === 'text-to-speech') return getTextToSpeechModels(providerId);
	if (capability === 'text-to-video') {
		return cloneModels(MODEL_CATALOGS_BY_CAPABILITY.textToVideo[normalizeProviderId(providerId)]);
	}
	if (capability === 'music') {
		return cloneModels(MODEL_CATALOGS_BY_CAPABILITY.music[normalizeProviderId(providerId)]);
	}
	return getTextToImageModels(providerId);
}

function cloneModels(models: readonly Model[] | undefined): Model[] {
	return (models ?? []).map((model) => ({ ...model }));
}

function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}
