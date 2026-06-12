import type {
	SttTranscriptionRequest,
	SttTranscriptionResult,
} from '../../stt/transcription';

export const SttChannels = {
	transcribe: 'stt:transcribe',
} as const;

export interface SttInvokeChannelMap {
	[SttChannels.transcribe]: {
		args: [request: SttTranscriptionRequest];
		result: SttTranscriptionResult;
	};
}
