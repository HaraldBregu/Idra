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
} from '../../../../src/main/ipc/realtime-transcription-ipc';
import {
	REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
	REALTIME_TRANSCRIPTION_CONNECTION_MODEL_ID,
	REALTIME_TRANSCRIPTION_SAMPLE_RATE,
} from '../../../../src/shared/service';

describe('realtime transcription IPC', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('connects through the realtime socket model while reserving whisper for transcription', () => {
		const client = {
			apiKey: 'sk-test',
			baseURL: 'https://api.openai.com/v1',
		};

		createRealtimeTranscriptionSocket(client);

		expect(OpenAIRealtimeWebSocket).toHaveBeenCalledWith(
			{ model: REALTIME_TRANSCRIPTION_CONNECTION_MODEL_ID },
			client
		);
	});

	it('builds a transcription session update for gpt-realtime-whisper without VAD', () => {
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
});
