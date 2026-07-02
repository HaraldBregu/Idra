import {
	LLM_MODELS_BY_PROVIDER,
	MODEL_CAPABILITIES,
	MUSIC_PROVIDER_IDS,
	SPEECH_TO_TEXT_API_TYPES,
	SPEECH_TO_TEXT_PROVIDER_IDS,
	TEXT_TO_IMAGE_PROVIDER_IDS,
	TEXT_TO_SPEECH_PROVIDER_IDS,
} from './provider_models_definitions';

export type ProviderModelStatus = 'active' | 'deprecated' | 'verify';

export interface ProviderModel {
	readonly id: string;
	readonly name: string;
	readonly status: ProviderModelStatus;
}

export type ModelCatalog = Readonly<Record<string, readonly ProviderModel[]>>;

export type ModelCapability = (typeof MODEL_CAPABILITIES)[number];

export type LlmProviderId = keyof typeof LLM_MODELS_BY_PROVIDER;

export type SpeechToTextProviderId = (typeof SPEECH_TO_TEXT_PROVIDER_IDS)[number];

export type SpeechToTextApiType = (typeof SPEECH_TO_TEXT_API_TYPES)[number];

export type TextToSpeechProviderId = (typeof TEXT_TO_SPEECH_PROVIDER_IDS)[number];

export type TextToImageProviderId = (typeof TEXT_TO_IMAGE_PROVIDER_IDS)[number];

export type MusicProviderId = (typeof MUSIC_PROVIDER_IDS)[number];
