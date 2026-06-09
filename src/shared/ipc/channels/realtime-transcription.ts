export const RealtimeTranscriptionChannels = {
	appendAudio: 'realtime-transcription:append-audio',
	finish: 'realtime-transcription:finish',
	cancel: 'realtime-transcription:cancel',
	event: 'realtime-transcription:event',
} as const;

export interface RealtimeTranscriptionInvokeChannelMap {
	[RealtimeTranscriptionChannels.finish]: {
		args: [sessionId: string];
		result: void;
	};
	[RealtimeTranscriptionChannels.cancel]: {
		args: [sessionId: string];
		result: void;
	};
}

export interface RealtimeTranscriptionSendChannelMap {
	[RealtimeTranscriptionChannels.appendAudio]: {
		args: [sessionId: string, audio: string];
	};
}

export interface RealtimeTranscriptionEventChannelMap {
	[RealtimeTranscriptionChannels.event]: {
		data: import('../realtime-transcription').RealtimeTranscriptionEvent;
	};
}
