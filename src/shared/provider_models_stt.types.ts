import {
	SPEECH_TO_TEXT_API_TYPES,
	SPEECH_TO_TEXT_PROVIDER_IDS,
} from './provider_models_stt.definitions';

export type SpeechToTextProviderId = (typeof SPEECH_TO_TEXT_PROVIDER_IDS)[number];
export type SpeechToTextApiType = (typeof SPEECH_TO_TEXT_API_TYPES)[number];
