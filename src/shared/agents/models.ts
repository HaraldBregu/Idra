import type { Model, ModelReasoningEffort } from './reasoning';
import {
	DEFAULT_AGENT_MODELS_BY_PROVIDER,
	filterSelectableAgentModels,
	getDefaultAgentModels,
	hasDefaultAgentModels,
	isAllowedAgentModel,
} from '../providers/agent-models';
import {
	hasDefaultProviderCapability,
	providerHasImageCapability,
	type Provider,
} from '../providers';
import {
	EMBEDDING_MODELS_BY_PROVIDER,
	LLM_MODELS_BY_PROVIDER,
	MODEL_CATALOGS_BY_CAPABILITY,
	IMAGE_CREATOR_MODELS as TEXT_TO_IMAGE_MODELS,
	LEGACY_SPEECH_TRANSCRIBER_MODEL_IDS,
	SPEECH_TRANSCRIBER_MODEL_IDS,
	SPEECH_TRANSCRIBER_PROVIDER_ID,
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

export interface ModelSelection {
	provider: Omit<Provider, 'apiKey'>;
	model: Model;
}
export {
	DEFAULT_AGENT_MODELS_BY_PROVIDER,
	LLM_MODELS_BY_PROVIDER,
	MODEL_CATALOGS_BY_CAPABILITY,
	EMBEDDING_MODELS_BY_PROVIDER,
	SPEECH_TO_TEXT_MODELS,
	SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
	TEXT_TO_IMAGE_MODELS,
	TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
	filterSelectableAgentModels,
	getDefaultAgentModels,
	hasDefaultAgentModels,
	isAllowedAgentModel,
};

export type { ModelCapability, ModelCatalog };

export function getLlmModels(providerId: string): Model[] {
	return getLlmModelsByProvider(providerId);
}

export function isRealtimeSpeechTranscriberModel(modelId: string): boolean {
	return (SPEECH_TRANSCRIBER_MODEL_IDS as readonly string[]).includes(modelId.trim());
}

export function getSpeechToTextModels(providerId: string): Model[] {
	return getSpeechToTextModelsByProvider(providerId);
}

export function hasSpeechToTextModels(providerId: string): boolean {
	return getSpeechToTextModels(providerId).length > 0;
}

export function isAllowedSpeechToTextModel(providerId: string, modelId: string): boolean {
	const normalizedModelId = modelId.trim();
	if (
		providerId.trim().toLowerCase() === SPEECH_TRANSCRIBER_PROVIDER_ID &&
		(LEGACY_SPEECH_TRANSCRIBER_MODEL_IDS as readonly string[]).includes(normalizedModelId)
	) {
		return true;
	}
	return getSpeechToTextModels(providerId).some((model) => model.id === normalizedModelId);
}

export function getTextToSpeechModels(providerId = TEXT_TO_SPEECH_PROVIDER_ID): Model[] {
	return getTextToSpeechModelsByProvider(providerId);
}

export function isAllowedTextToSpeechModel(providerId: string, modelId: string): boolean {
	const normalizedModelId = modelId.trim();
	return getTextToSpeechModels(providerId).some((model) => model.id === normalizedModelId);
}

export function getTextToImageModels(providerId: string): Model[] {
	return getTextToImageModelsByProvider(providerId);
}

export function getTextToImageModelsForProvider(
	provider: Pick<Provider, 'id' | 'capabilities'>
): Model[] {
	return getImageCreatorModelsForProvider(provider);
}

export function getImageCreatorModelsForProvider(
	provider: Pick<Provider, 'id' | 'capabilities'>
): Model[] {
	if (!providerHasImageCapability(provider)) return [];
	const catalogModels = getTextToImageModelsByProvider(provider.id);
	return catalogModels.length > 0
		? catalogModels
		: TEXT_TO_IMAGE_MODELS.map((model) => ({ ...model }));
}

export function getImageCreatorModels(providerId: string): Model[] {
	if (!hasDefaultProviderCapability(providerId, 'Image')) return [];
	return getTextToImageModelsByProvider(providerId);
}

export function hasImageCreatorModelsForProvider(
	provider: Pick<Provider, 'id' | 'capabilities'>
): boolean {
	return getImageCreatorModelsForProvider(provider).length > 0;
}

export function isAllowedImageCreatorModelForProvider(
	provider: Pick<Provider, 'id' | 'capabilities'>,
	modelId: string
): boolean {
	const normalizedModelId = modelId.trim();
	return getImageCreatorModelsForProvider(provider).some((model) => model.id === normalizedModelId);
}

export function getTextToVideoModels(providerId: string): Model[] {
	return getTextToVideoModelsByProvider(providerId);
}

export function isAllowedTextToVideoModel(providerId: string, modelId: string): boolean {
	const normalizedModelId = modelId.trim();
	return getTextToVideoModels(providerId).some((model) => model.id === normalizedModelId);
}

export function getMusicModels(providerId: string): Model[] {
	return getMusicModelsByProvider(providerId);
}

export function getMusicCreatorModels(providerId: string): Model[] {
	return getMusicModelsByProvider(providerId);
}

export function isAllowedMusicCreatorModel(providerId: string, modelId: string): boolean {
	const normalizedModelId = modelId.trim();
	return getMusicCreatorModels(providerId).some((model) => model.id === normalizedModelId);
}

export function getEmbeddingModels(providerId: string): Model[] {
	return getEmbeddingModelsByProvider(providerId);
}

export function getModelsByCapability(capability: ModelCapability, providerId: string): Model[] {
	return getProviderModelsByCapability(capability, providerId);
}
