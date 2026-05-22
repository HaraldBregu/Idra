export * from './models';
export * from './definitions';
export * from './llm-models';
export * from './speech-to-text-models';
export * from './text-to-speech-models';
export * from './realtime-voice-models';
export * from './image-models';
export * from './video-models';
export * from './audio-models';
export * from './three-d-models';
export * from './embedding-models';

import {
	cloneModels,
	normalizeProviderId,
	type ModelCapability,
	type ModelCatalog,
	type ProviderModel,
} from './models';
import { LLM_MODELS_BY_PROVIDER, RESEARCH_CHAT_MODELS_BY_PROVIDER } from './llm-models';
import { SPEECH_TO_TEXT_MODELS_BY_PROVIDER } from './speech-to-text-models';
import { TEXT_TO_SPEECH_MODELS_BY_PROVIDER } from './text-to-speech-models';
import { REALTIME_VOICE_MODELS_BY_PROVIDER } from './realtime-voice-models';
import { TEXT_TO_IMAGE_MODELS_BY_PROVIDER } from './image-models';
import { TEXT_TO_VIDEO_MODELS_BY_PROVIDER } from './video-models';
import { MUSIC_CREATOR_MODELS_BY_PROVIDER, TEXT_TO_AUDIO_MODELS_BY_PROVIDER } from './audio-models';
import { THREE_D_MODELS_BY_PROVIDER } from './three-d-models';
import { EMBEDDING_MODELS_BY_PROVIDER } from './embedding-models';

export const MODEL_CATALOGS_BY_CAPABILITY = {
	llm: LLM_MODELS_BY_PROVIDER,
	'research-chat': RESEARCH_CHAT_MODELS_BY_PROVIDER,
	'speech-to-text': SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
	'text-to-speech': TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
	'realtime-voice': REALTIME_VOICE_MODELS_BY_PROVIDER,
	'text-to-image': TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	'text-to-video': TEXT_TO_VIDEO_MODELS_BY_PROVIDER,
	'text-to-audio': TEXT_TO_AUDIO_MODELS_BY_PROVIDER,
	music: MUSIC_CREATOR_MODELS_BY_PROVIDER,
	'3d': THREE_D_MODELS_BY_PROVIDER,
	embedding: EMBEDDING_MODELS_BY_PROVIDER,
} as const satisfies Readonly<Record<ModelCapability, ModelCatalog>>;

export function getModelsForProvider(
	catalog: ModelCatalog,
	providerId: string
): ProviderModel[] {
	return cloneModels(catalog[normalizeProviderId(providerId)]);
}

export function getLlmModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(LLM_MODELS_BY_PROVIDER, providerId);
}

export function getResearchChatModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(RESEARCH_CHAT_MODELS_BY_PROVIDER, providerId);
}

export function getSpeechToTextModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(SPEECH_TO_TEXT_MODELS_BY_PROVIDER, providerId);
}

export function getTextToSpeechModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(TEXT_TO_SPEECH_MODELS_BY_PROVIDER, providerId);
}

export function getRealtimeVoiceModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(REALTIME_VOICE_MODELS_BY_PROVIDER, providerId);
}

export function getTextToImageModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(TEXT_TO_IMAGE_MODELS_BY_PROVIDER, providerId);
}

export function getTextToVideoModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(TEXT_TO_VIDEO_MODELS_BY_PROVIDER, providerId);
}

export function getTextToAudioModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(TEXT_TO_AUDIO_MODELS_BY_PROVIDER, providerId);
}

export function getMusicModelsByProvider(providerId: string): ProviderModel[] {
	return getTextToAudioModelsByProvider(providerId);
}

export function getThreeDModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(THREE_D_MODELS_BY_PROVIDER, providerId);
}

export function getEmbeddingModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(EMBEDDING_MODELS_BY_PROVIDER, providerId);
}

export function getModelsByCapability(
	capability: ModelCapability,
	providerId: string
): ProviderModel[] {
	return getModelsForProvider(MODEL_CATALOGS_BY_CAPABILITY[capability], providerId);
}
