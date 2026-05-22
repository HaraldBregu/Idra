import {
	getImageCreatorModelsForProvider,
	type Model,
	type ModelReasoningEffort,
} from './service';
import {
	DEFAULT_PROVIDERS,
	normalizeProviderId,
	type Provider,
} from '../providers';
import {
	CHAT_MODELS_BY_PROVIDER,
	EMBEDDING_MODELS_BY_PROVIDER,
	LLM_MODELS_BY_PROVIDER,
	MODEL_CATALOGS_BY_CAPABILITY,
	IMAGE_CREATOR_MODELS as TEXT_TO_IMAGE_MODELS,
	SPEECH_TO_TEXT_MODELS,
	SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
	TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_PROVIDER_ID,
	getEmbeddingModelsByProvider,
	getLlmModelsByProvider,
	getModelsByCapability as getProviderModelsByCapability,
	getMusicModelsByProvider,
	getSpeechToTextModelsByProvider,
	getTextToImageModelsByProvider,
	getTextToSpeechModelsByProvider,
	getTextToVideoModelsByProvider,
	type ModelCapability,
	type ModelCatalog,
} from '../providers';

export type { Model, ModelReasoningEffort };
export {
	LLM_MODELS_BY_PROVIDER,
	MODEL_CATALOGS_BY_CAPABILITY,
	EMBEDDING_MODELS_BY_PROVIDER,
	SPEECH_TO_TEXT_MODELS,
	SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
	TEXT_TO_IMAGE_MODELS,
	TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
};

export type { ModelCapability, ModelCatalog };

export const DEFAULT_AGENT_MODELS_BY_PROVIDER: ModelCatalog = CHAT_MODELS_BY_PROVIDER;

function isDefaultProvider(providerId: string): boolean {
	const normalizedProviderId = normalizeProviderId(providerId);
	return DEFAULT_PROVIDERS.some(
		(provider) => normalizeProviderId(provider.id) === normalizedProviderId
	);
}

export function getDefaultAgentModels(providerId: string): Model[] {
	return (DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)] ?? []).map((model) => ({
		...model,
	}));
}

export function hasDefaultAgentModels(providerId: string): boolean {
	return DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)] !== undefined;
}

function defaultModelsForProvider(providerId: string): readonly Model[] | undefined {
	return DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)];
}

export function isAllowedAgentModel(providerId: string, modelId: string): boolean {
	const normalizedModelId = modelId.trim();
	const defaultModels = defaultModelsForProvider(providerId);

	if (defaultModels) {
		return defaultModels.some((model) => model.id === normalizedModelId);
	}

	return !isDefaultProvider(providerId);
}

export function filterSelectableAgentModels(providerId: string, models: Model[]): Model[] {
	const defaultModels = defaultModelsForProvider(providerId);
	if (!defaultModels) {
		return isDefaultProvider(providerId) ? [] : models;
	}

	const byId = new Map(models.map((model) => [model.id.trim(), model]));
	return defaultModels.flatMap((defaultModel) => {
		const model = byId.get(defaultModel.id);
		return model ? [model] : [];
	});
}

export function getLlmModels(providerId: string): Model[] {
	return getLlmModelsByProvider(providerId);
}

export function getSpeechToTextModels(providerId: string): Model[] {
	return getSpeechToTextModelsByProvider(providerId);
}

export function getTextToSpeechModels(providerId = TEXT_TO_SPEECH_PROVIDER_ID): Model[] {
	return getTextToSpeechModelsByProvider(providerId);
}

export function getTextToImageModels(providerId: string): Model[] {
	return getTextToImageModelsByProvider(providerId);
}

export function getTextToImageModelsForProvider(
	provider: Pick<Provider, 'id' | 'capabilities'>
): Model[] {
	return getImageCreatorModelsForProvider(provider);
}

export function getTextToVideoModels(providerId: string): Model[] {
	return getTextToVideoModelsByProvider(providerId);
}

export function getMusicModels(providerId: string): Model[] {
	return getMusicModelsByProvider(providerId);
}

export function getEmbeddingModels(providerId: string): Model[] {
	return getEmbeddingModelsByProvider(providerId);
}

export function getModelsByCapability(capability: ModelCapability, providerId: string): Model[] {
	return getProviderModelsByCapability(capability, providerId);
}
