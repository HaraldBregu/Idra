import type {
	SttRealtimeEvent,
	SttRealtimeStartRequest,
	SttRealtimeSession,
	SttTranscriptionRequest,
	SttTranscriptionResult,
} from '../../stt/transcription';

export const SttChannels = {
	appendRealtimeAudio: 'stt:append-realtime-audio',
	cancelRealtime: 'stt:cancel-realtime',
	finishRealtime: 'stt:finish-realtime',
	realtimeEvent: 'stt:realtime-event',
	startRealtime: 'stt:start-realtime',
	transcribe: 'stt:transcribe',
} as const;

export interface SttInvokeChannelMap {
	[SttChannels.transcribe]: {
		args: [request: SttTranscriptionRequest];
		result: SttTranscriptionResult;
	};
	[SttChannels.startRealtime]: {
		args: [request: SttRealtimeStartRequest | undefined];
		result: SttRealtimeSession;
	};
	[SttChannels.appendRealtimeAudio]: {
		args: [sessionId: string, audio: string];
		result: void;
	};
	[SttChannels.finishRealtime]: {
		args: [sessionId: string];
		result: void;
	};
	[SttChannels.cancelRealtime]: {
		args: [sessionId: string];
		result: void;
	};
}

export interface SttEventChannelMap {
	[SttChannels.realtimeEvent]: { data: SttRealtimeEvent };
}
