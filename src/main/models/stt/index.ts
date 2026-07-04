export {
	getSelection,
	listProviders,
	listModels,
	saveSelection,
	transcribe,
	startRealtime,
	appendRealtimeAudio,
	finishRealtime,
	cancelRealtime,
} from './stt_transcribe';
export { buildSttAdapter } from './stt_factory';
export {
	SttProviderAuthError,
	SttProviderRequestError,
	SttProviderUnsupportedError,
} from './stt_errors';
export type { SttAdapter, SttAdapterTranscriptionRequest, SttProviderSpec } from './stt_types';
