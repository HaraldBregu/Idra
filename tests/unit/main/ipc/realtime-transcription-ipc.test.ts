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
	createMistralHttpServerUrl,
	createMistralRealtimeServerUrl,
	createMistralRealtimeSpeechToTextAdapter,
	createQwenRealtimeTranscriptionResponseCreate,
	createQwenRealtimeTranscriptionSessionUpdate,
	createQwenRealtimeTranscriptionUrl,
	decodedRealtimeTranscriptionAudioByteLength,
	hasMinimumRealtimeTranscriptionAudio,
	hasStreamingRealtimeTranscriptionAudio,
	isInputAudioBufferTooSmallError,
	MINIMUM_REALTIME_TRANSCRIPTION_COMMIT_BYTES,
	STREAMING_REALTIME_TRANSCRIPTION_COMMIT_BYTES,
	useRealtimeTranscriptionIntent,
} from '../../../../src/main/stt';
import {
	REALTIME_TRANSCRIPTION_SAMPLE_RATE,
} from '../../../../src/shared/service';
import {
	MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID,
	MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
	QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID,
	QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID,
	REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
} from '../../../../src/shared/provider-models';

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

	it('maps Mistral API base URLs to the realtime websocket server URL', () => {
		expect(createMistralHttpServerUrl('https://api.mistral.ai/v1')).toBe(
			'https://api.mistral.ai'
		);
		expect(createMistralRealtimeServerUrl('https://api.mistral.ai/v1')).toBe(
			'wss://api.mistral.ai'
		);
		expect(createMistralRealtimeServerUrl('http://localhost:8080/v1')).toBe(
			'ws://localhost:8080'
		);
	});

	it('maps Qwen catalog STT ids to realtime websocket URLs', () => {
		expect(
			createQwenRealtimeTranscriptionUrl(
				'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
				QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID
			)
		).toBe(
			'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3.5-omni-flash-realtime'
		);
		expect(
			createQwenRealtimeTranscriptionUrl(
				'https://dashscope.aliyuncs.com/compatible-mode/v1',
				QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID
			)
		).toBe(
			'wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3-omni-flash-realtime'
		);
	});

	it('builds Qwen realtime transcription session and response events', () => {
		expect(createQwenRealtimeTranscriptionSessionUpdate({ language: 'en-US' })).toEqual({
			type: 'session.update',
			session: {
				modalities: ['text'],
				input_audio_format: 'pcm',
				instructions:
					'Transcribe user speech verbatim. Return only transcript text. Language hint: en-US.',
				turn_detection: null,
			},
		});
		expect(createQwenRealtimeTranscriptionResponseCreate()).toEqual({
			type: 'response.create',
			response: {
				modalities: ['text'],
			},
		});
	});

	it('keeps the Mistral realtime STT model id aligned with the provider catalog', () => {
		expect(MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID).toBe(
			'voxtral-mini-transcribe-realtime-2602'
		);
	});

	it('routes both Mistral STT catalog models to the Mistral adapter', () => {
		const adapter = createMistralRealtimeSpeechToTextAdapter();

		expect(adapter.supports('mistral', MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID)).toBe(true);
		expect(adapter.supports('mistral', MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID)).toBe(true);
	});
});
