export const SpeechToTextChannels = {
	transcribe: 'speech-to-text:transcribe',
	startDictation: 'speech-to-text:start-dictation',
	appendAudio: 'speech-to-text:append-audio',
	finishDictation: 'speech-to-text:finish-dictation',
	cancelDictation: 'speech-to-text:cancel-dictation',
	event: 'speech-to-text:event',
} as const;

export interface SpeechToTextInvokeChannelMap {
	[SpeechToTextChannels.finishDictation]: {
		args: [sessionId: string];
		result: void;
	};
	[SpeechToTextChannels.cancelDictation]: {
		args: [sessionId: string];
		result: void;
	};
}

export interface SpeechToTextSendChannelMap {
	[SpeechToTextChannels.appendAudio]: {
		args: [sessionId: string, audio: string];
	};
}

export interface SpeechToTextEventChannelMap {
	[SpeechToTextChannels.event]: {
		data: import('../../speech-to-text').SpeechToTextEvent;
	};
}
