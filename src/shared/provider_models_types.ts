import {
	SPEECH_TO_TEXT_API_TYPES,
	SPEECH_TO_TEXT_PROVIDER_IDS,
	TEXT_TO_SPEECH_PROVIDER_IDS,
} from './provider_models_definitions';

export type ProviderModelStatus = 'active' | 'deprecated' | 'verify';

export interface ProviderModel {
	readonly id: string;
	readonly name: string;
	readonly status: ProviderModelStatus;
}

export type ModelCatalog = Readonly<Record<string, readonly ProviderModel[]>>;

export type SpeechToTextProviderId = (typeof SPEECH_TO_TEXT_PROVIDER_IDS)[number];

export type SpeechToTextApiType = (typeof SPEECH_TO_TEXT_API_TYPES)[number];

export type TextToSpeechProviderId = (typeof TEXT_TO_SPEECH_PROVIDER_IDS)[number];
