jest.mock('openai/realtime/websocket', () => ({
	OpenAIRealtimeWebSocket: jest.fn((props, client) => ({
		props,
		client,
	})),
}));

import { OpenAIRealtimeWebSocket } from 'openai/realtime/websocket';
import {
	createRealtimeTranscriptionSessionUpdate,
	createRealtimeTranscriptionSocket,
	decodedRealtimeTranscriptionAudioByteLength,
	hasMinimumRealtimeTranscriptionAudio,
	hasStreamingRealtimeTranscriptionAudio,
	isInputAudioBufferTooSmallError,
	MINIMUM_REALTIME_TRANSCRIPTION_COMMIT_BYTES,
	STREAMING_REALTIME_TRANSCRIPTION_COMMIT_BYTES,
	useRealtimeTranscriptionIntent,
} from '../../../../src/main/ipc/realtime-transcription-ipc';
import {
	REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
	REALTIME_TRANSCRIPTION_SAMPLE_RATE,
} from '../../../../src/shared/service';

describe('realtime transcription IPC', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('connects realtime transcription sockets with the transcription intent', () => {
		const client = {
			apiKey: 'sk-test',
			baseURL: 'https://api.openai.com/v1',
		};

		createRealtimeTranscriptionSocket(client);

		const [props, passedClient] = (OpenAIRealtimeWebSocket as jest.Mock).mock.calls[0];
		expect(props.model).toBe('gpt-realtime');
		expect(props.onURL).toBe(useRealtimeTranscriptionIntent);
		expect(passedClient).toBe(client);
	});

	it('uses the documented realtime transcription websocket intent', () => {
		const url = new URL('wss://api.openai.com/v1/realtime?model=gpt-realtime');

		useRealtimeTranscriptionIntent(url);

		expect(url.toString()).toBe('wss://api.openai.com/v1/realtime?intent=transcription');
	});

	it('builds a transcription session update for gpt-realtime-whisper with manual chunking', () => {
		expect(
			createRealtimeTranscriptionSessionUpdate(REALTIME_SPEECH_TRANSCRIBER_MODEL_ID, {
				language: 'en-US',
			})
		).toEqual({
			type: 'session.update',
			session: {
				type: 'transcription',
				audio: {
					input: {
						format: {
							type: 'audio/pcm',
							rate: REALTIME_TRANSCRIPTION_SAMPLE_RATE,
						},
						transcription: {
							model: REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
							language: 'en-US',
						},
						turn_detection: null,
					},
				},
			},
		});
	});

	it('omits unsupported language tags from the session update', () => {
		const event = createRealtimeTranscriptionSessionUpdate(
			REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
			{ language: 'english' }
		);

		expect(
			(event.session as { audio: { input: { transcription: { language?: string } } } })
				.audio.input.transcription.language
		).toBeUndefined();
	});

	it('guards manual commits until enough PCM audio is buffered', () => {
		expect(decodedRealtimeTranscriptionAudioByteLength('AAAA')).toBe(3);
		expect(hasMinimumRealtimeTranscriptionAudio(MINIMUM_REALTIME_TRANSCRIPTION_COMMIT_BYTES - 1)).toBe(
			false
		);
		expect(hasMinimumRealtimeTranscriptionAudio(MINIMUM_REALTIME_TRANSCRIPTION_COMMIT_BYTES)).toBe(
			true
		);
		expect(
			hasStreamingRealtimeTranscriptionAudio(STREAMING_REALTIME_TRANSCRIPTION_COMMIT_BYTES - 1)
		).toBe(false);
		expect(
			hasStreamingRealtimeTranscriptionAudio(STREAMING_REALTIME_TRANSCRIPTION_COMMIT_BYTES)
		).toBe(true);
	});

	it('recognizes the realtime empty audio commit error as ignorable during finish', () => {
		expect(
			isInputAudioBufferTooSmallError('Error committing input audio buffer: buffer too small:')
		).toBe(true);
		expect(isInputAudioBufferTooSmallError('Realtime transcription failed.')).toBe(false);
	});
});
