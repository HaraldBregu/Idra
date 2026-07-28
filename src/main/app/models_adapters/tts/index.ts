export { synthesize } from './tts_synthesize';
export { buildSpeechAdapter } from './tts_factory';
export {
	SpeechProviderAuthError,
	SpeechProviderRequestError,
	SpeechProviderUnsupportedError,
} from './tts_errors';
export type { SpeechAdapter, SpeechAdapterRequest, SpeechProviderSpec } from './tts_types';
