jest.mock('openai/realtime/websocket', () => ({
	OpenAIRealtimeWebSocket: jest.fn((props, client) => ({
		props,
		client,
	})),
}));

import { OpenAIRealtimeWebSocket } from 'openai/realtime/websocket';
import {
	createDeepgramRealtimeTranscriptionUrl,
	createDeepgramSpeechToTextAdapter,
	createDeepgramSpeechToTextUrl,
	createElevenLabsRealtimeTranscriptionUrl,
	createElevenLabsSpeechToTextAdapter,
	createElevenLabsSpeechToTextUrl,
	createOpenAIRealtimeSpeechToTextAdapter,
	createRealtimeTranscriptionSessionUpdate,
	createRealtimeTranscriptionSocket,
	createMistralHttpServerUrl,
	createMistralRealtimeServerUrl,
	createMistralRealtimeSpeechToTextAdapter,
	createQwenRealtimeTranscriptionResponseCreate,
	createQwenRealtimeTranscriptionSessionUpdate,
	createQwenRealtimeTranscriptionUrl,
	createXaiRealtimeTranscriptionUrl,
	createXaiSpeechToTextAdapter,
	createXaiSpeechToTextUrl,
	decodedRealtimeTranscriptionAudioByteLength,
	hasMinimumRealtimeTranscriptionAudio,
	hasStreamingRealtimeTranscriptionAudio,
	isInputAudioBufferTooSmallError,
	MINIMUM_REALTIME_TRANSCRIPTION_COMMIT_BYTES,
	resolveOpenAIRealtimeTranscriptionModel,
	STREAMING_REALTIME_TRANSCRIPTION_COMMIT_BYTES,
	SpeechToTextService,
	useRealtimeTranscriptionIntent,
} from '../../../../src/main/stt';
import { RealtimeTranscriptionChannels } from '../../../../src/shared/ipc-channels';
import {
	REALTIME_TRANSCRIPTION_SAMPLE_RATE,
} from '../../../../src/shared/service';
import {
	isRealtimeTranscriptionAudioChunk,
	isRealtimeTranscriptionSessionId,
	normalizeRealtimeTranscriptionStartRequest,
} from '../../../../src/shared/realtime-transcription';
import { normalizeSpeechToTextTranscribeRequest } from '../../../../src/shared/speech-to-text';
import {
	DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID,
	DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID,
	ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
	ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID,
	MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID,
	MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
	MINI_SPEECH_TRANSCRIBER_MODEL_ID,
	QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID,
	QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID,
	REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
	XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID,
	XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID,
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

	it('builds a transcription session update for OpenAI with manual chunking', () => {
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
							delay: 'high',
							language: 'en-US',
						},
						turn_detection: null,
					},
				},
			},
		});
	});

	it('supports OpenAI realtime transcription and maps legacy saved model ids', () => {
		const adapter = createOpenAIRealtimeSpeechToTextAdapter();

		expect(adapter.supports('openai', REALTIME_SPEECH_TRANSCRIBER_MODEL_ID)).toBe(true);
		expect(adapter.supports('openai', MINI_SPEECH_TRANSCRIBER_MODEL_ID)).toBe(true);
		expect(resolveOpenAIRealtimeTranscriptionModel(MINI_SPEECH_TRANSCRIBER_MODEL_ID)).toBe(
			REALTIME_SPEECH_TRANSCRIBER_MODEL_ID
		);
		expect(adapter.supports('mistral', MINI_SPEECH_TRANSCRIBER_MODEL_ID)).toBe(false);
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

	it('validates realtime transcription IPC payload shapes', () => {
		expect(normalizeRealtimeTranscriptionStartRequest({ language: ' en-US ' })).toEqual({
			language: 'en-US',
		});
		expect(normalizeRealtimeTranscriptionStartRequest(undefined)).toBeUndefined();
		expect(() => normalizeRealtimeTranscriptionStartRequest({ language: 123 })).toThrow(
			'Invalid realtime transcription language.'
		);
		expect(isRealtimeTranscriptionSessionId('session-1')).toBe(true);
		expect(isRealtimeTranscriptionSessionId('')).toBe(false);
		expect(isRealtimeTranscriptionAudioChunk('AAAA')).toBe(true);
		expect(isRealtimeTranscriptionAudioChunk('not base64?')).toBe(false);
	});

	it('validates speech-to-text batch IPC payload shapes', () => {
		expect(
			normalizeSpeechToTextTranscribeRequest({ audio: ' AAAA ', language: ' en-US ' })
		).toEqual({ audio: 'AAAA', language: 'en-US' });
		expect(() => normalizeSpeechToTextTranscribeRequest(undefined)).toThrow(
			'Invalid speech-to-text request.'
		);
		expect(() => normalizeSpeechToTextTranscribeRequest({ audio: '' })).toThrow(
			'Invalid speech-to-text audio.'
		);
		expect(() =>
			normalizeSpeechToTextTranscribeRequest({ audio: 'AAAA', language: 123 })
		).toThrow('Invalid realtime transcription language.');
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

	it('maps Deepgram STT base URLs to HTTP and realtime endpoints', () => {
		const batchUrl = new URL(
			createDeepgramSpeechToTextUrl('https://api.deepgram.com/v1', DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID, {
				language: 'en-US',
			})
		);
		expect(batchUrl.origin).toBe('https://api.deepgram.com');
		expect(batchUrl.pathname).toBe('/v1/listen');
		expect(batchUrl.searchParams.get('model')).toBe(DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID);
		expect(batchUrl.searchParams.get('encoding')).toBe('linear16');
		expect(batchUrl.searchParams.get('sample_rate')).toBe(String(REALTIME_TRANSCRIPTION_SAMPLE_RATE));
		expect(batchUrl.searchParams.get('language')).toBe('en-US');

		const realtimeUrl = new URL(
			createDeepgramRealtimeTranscriptionUrl(
				'https://api.deepgram.com/v1',
				DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID,
				{ language: 'it-IT' }
			)
		);
		expect(realtimeUrl.origin).toBe('wss://api.deepgram.com');
		expect(realtimeUrl.pathname).toBe('/v2/listen');
		expect(realtimeUrl.searchParams.get('model')).toBe('flux-general-multi');
		expect(realtimeUrl.searchParams.get('language_hint')).toBe('it');
		expect(realtimeUrl.searchParams.get('mip_opt_out')).toBe('true');
	});

	it('routes both Deepgram STT catalog models to the Deepgram adapter', () => {
		const adapter = createDeepgramSpeechToTextAdapter();

		expect(adapter.supports('deepgram', DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID)).toBe(true);
		expect(adapter.supports('deepgram', DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID)).toBe(true);
		expect(adapter.supports('openai', DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID)).toBe(false);
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

	it('maps ElevenLabs STT base URLs to HTTP and realtime endpoints', () => {
		expect(createElevenLabsSpeechToTextUrl('https://api.elevenlabs.io/v1')).toBe(
			'https://api.elevenlabs.io/v1/speech-to-text'
		);
		expect(createElevenLabsSpeechToTextUrl('https://api.elevenlabs.io')).toBe(
			'https://api.elevenlabs.io/v1/speech-to-text'
		);

		const realtimeUrl = new URL(
			createElevenLabsRealtimeTranscriptionUrl(
				'https://api.elevenlabs.io/v1',
				ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
				{ language: 'en-US' }
			)
		);
		expect(realtimeUrl.origin).toBe('wss://api.elevenlabs.io');
		expect(realtimeUrl.pathname).toBe('/v1/speech-to-text/realtime');
		expect(realtimeUrl.searchParams.get('model_id')).toBe(
			ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID
		);
		expect(realtimeUrl.searchParams.get('audio_format')).toBe('pcm_24000');
		expect(realtimeUrl.searchParams.get('commit_strategy')).toBe('manual');
		expect(realtimeUrl.searchParams.get('language_code')).toBe('en');
	});

	it('routes both ElevenLabs STT catalog models to the ElevenLabs adapter', () => {
		const adapter = createElevenLabsSpeechToTextAdapter();

		expect(adapter.supports('elevenlabs', ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID)).toBe(
			true
		);
		expect(
			adapter.supports('elevenlabs', ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID)
		).toBe(true);
		expect(adapter.supports('openai', ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID)).toBe(false);
	});

	it('maps xAI STT base URLs to HTTP and realtime endpoints', () => {
		expect(createXaiSpeechToTextUrl('https://api.x.ai/v1')).toBe(
			'https://api.x.ai/v1/stt'
		);
		expect(createXaiSpeechToTextUrl('https://api.x.ai')).toBe(
			'https://api.x.ai/v1/stt'
		);

		const realtimeUrl = new URL(
			createXaiRealtimeTranscriptionUrl('https://api.x.ai/v1', { language: 'en-US' })
		);
		expect(realtimeUrl.origin).toBe('wss://api.x.ai');
		expect(realtimeUrl.pathname).toBe('/v1/stt');
		expect(realtimeUrl.searchParams.get('sample_rate')).toBe(
			String(REALTIME_TRANSCRIPTION_SAMPLE_RATE)
		);
		expect(realtimeUrl.searchParams.get('encoding')).toBe('pcm');
		expect(realtimeUrl.searchParams.get('interim_results')).toBe('true');
		expect(realtimeUrl.searchParams.get('language')).toBe('en');
	});

	it('routes both xAI STT catalog models to the xAI adapter', () => {
		const adapter = createXaiSpeechToTextAdapter();

		expect(adapter.supports('xai', XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID)).toBe(true);
		expect(adapter.supports('xai', XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID)).toBe(true);
		expect(adapter.supports('openai', XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID)).toBe(false);
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

	it('starts the Mistral offline STT model through default service adapters', async () => {
		const provider = {
			id: 'mistral',
			name: 'Mistral AI',
			baseUrl: 'https://api.mistral.ai/v1',
			apiKey: 'mistral-key',
		};
		const service = new SpeechToTextService({
			store: {
				getSpeechToTextOperator: jest.fn(() => ({
					id: 'speech-to-text',
					name: 'Speech to text',
					docsPath: 'models/speech-to-text.md',
					status: 'implemented',
					provider,
					model: {
						id: MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID,
						name: 'Voxtral Mini 2602',
					},
				})),
				getProviderById: jest.fn(() => provider),
			} as never,
		});
		const owner = {
			id: 1,
			once: jest.fn(),
			isDestroyed: jest.fn(() => false),
			send: jest.fn(),
		};

		const session = await service.start(owner as never);

		expect(session).toMatchObject({
			model: MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID,
			sampleRate: REALTIME_TRANSCRIPTION_SAMPLE_RATE,
		});
		expect(owner.send).toHaveBeenCalledWith(RealtimeTranscriptionChannels.event, {
			type: 'started',
			sessionId: session.id,
			model: MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID,
		});
	});

	it('starts the Deepgram batch STT model through default service adapters', async () => {
		const provider = {
			id: 'deepgram',
			name: 'Deepgram',
			baseUrl: 'https://api.deepgram.com/v1',
			apiKey: 'deepgram-key',
		};
		const service = new SpeechToTextService({
			store: {
				getSpeechToTextOperator: jest.fn(() => ({
					id: 'speech-to-text',
					name: 'Speech to text',
					docsPath: 'models/speech-to-text.md',
					status: 'implemented',
					provider,
					model: {
						id: DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID,
						name: 'Nova 3',
					},
				})),
				getProviderById: jest.fn(() => provider),
			} as never,
		});
		const owner = {
			id: 1,
			once: jest.fn(),
			isDestroyed: jest.fn(() => false),
			send: jest.fn(),
		};

		const session = await service.start(owner as never);

		expect(session).toMatchObject({
			model: DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID,
			sampleRate: REALTIME_TRANSCRIPTION_SAMPLE_RATE,
		});
		expect(owner.send).toHaveBeenCalledWith(RealtimeTranscriptionChannels.event, {
			type: 'started',
			sessionId: session.id,
			model: DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID,
		});
	});

	it('starts the ElevenLabs offline STT model through default service adapters', async () => {
		const provider = {
			id: 'elevenlabs',
			name: 'ElevenLabs',
			baseUrl: 'https://api.elevenlabs.io/v1',
			apiKey: 'elevenlabs-key',
		};
		const service = new SpeechToTextService({
			store: {
				getSpeechToTextOperator: jest.fn(() => ({
					id: 'speech-to-text',
					name: 'Speech to text',
					docsPath: 'models/speech-to-text.md',
					status: 'implemented',
					provider,
					model: {
						id: ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID,
						name: 'Scribe v2',
					},
				})),
				getProviderById: jest.fn(() => provider),
			} as never,
		});
		const owner = {
			id: 1,
			once: jest.fn(),
			isDestroyed: jest.fn(() => false),
			send: jest.fn(),
		};

		const session = await service.start(owner as never);

		expect(session).toMatchObject({
			model: ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID,
			sampleRate: REALTIME_TRANSCRIPTION_SAMPLE_RATE,
		});
		expect(owner.send).toHaveBeenCalledWith(RealtimeTranscriptionChannels.event, {
			type: 'started',
			sessionId: session.id,
			model: ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID,
		});
	});

	it('starts the xAI batch STT model through default service adapters', async () => {
		const provider = {
			id: 'xai',
			name: 'xAI',
			baseUrl: 'https://api.x.ai/v1',
			apiKey: 'xai-key',
		};
		const service = new SpeechToTextService({
			store: {
				getSpeechToTextOperator: jest.fn(() => ({
					id: 'speech-to-text',
					name: 'Speech to text',
					docsPath: 'models/speech-to-text.md',
					status: 'implemented',
					provider,
					model: {
						id: XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID,
						name: 'xAI STT Batch',
					},
				})),
				getProviderById: jest.fn(() => provider),
			} as never,
		});
		const owner = {
			id: 1,
			once: jest.fn(),
			isDestroyed: jest.fn(() => false),
			send: jest.fn(),
		};

		const session = await service.start(owner as never);

		expect(session).toMatchObject({
			model: XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID,
			sampleRate: REALTIME_TRANSCRIPTION_SAMPLE_RATE,
		});
		expect(owner.send).toHaveBeenCalledWith(RealtimeTranscriptionChannels.event, {
			type: 'started',
			sessionId: session.id,
			model: XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID,
		});
	});

	it('transcribes a complete audio payload through the configured STT adapter', async () => {
		const provider = {
			id: 'openai',
			name: 'OpenAI',
			baseUrl: 'https://api.openai.com/v1',
			apiKey: 'openai-key',
		};
		const appendAudio = jest.fn();
		const finish = jest.fn();
		const adapter = {
			supports: jest.fn((providerId: string, modelId: string) => {
				return providerId === 'openai' && modelId === REALTIME_SPEECH_TRANSCRIBER_MODEL_ID;
			}),
			startSession: jest.fn(async (config) => {
				return {
					id: config.sessionId,
					model: config.model.id,
					sampleRate: REALTIME_TRANSCRIPTION_SAMPLE_RATE,
					start: jest.fn(async () => ({
						id: config.sessionId,
						model: config.model.id,
						sampleRate: REALTIME_TRANSCRIPTION_SAMPLE_RATE,
					})),
					appendAudio,
					finish: () => {
						finish();
						config.callbacks.emit({
							type: 'completed',
							sessionId: config.sessionId,
							itemId: 'item-1',
							contentIndex: 0,
							transcript: 'hello world',
						});
						config.callbacks.closed(config.sessionId);
					},
					cancel: jest.fn(),
					close: jest.fn(),
				};
			}),
		};
		const service = new SpeechToTextService({
			store: {
				getSpeechToTextOperator: jest.fn(() => ({
					id: 'speech-to-text',
					name: 'Speech to text',
					docsPath: 'models/speech-to-text.md',
					status: 'implemented',
					provider,
					model: {
						id: REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
						name: 'GPT realtime transcribe',
					},
				})),
				getProviderById: jest.fn(() => provider),
			} as never,
			adapters: [adapter],
		});

		await expect(service.transcribe({ audio: 'AAAA', language: 'en' })).resolves.toEqual({
			model: REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
			transcript: 'hello world',
		});

		expect(adapter.startSession).toHaveBeenCalledWith(
			expect.objectContaining({
				provider,
				model: { id: REALTIME_SPEECH_TRANSCRIBER_MODEL_ID, name: 'GPT realtime transcribe' },
				request: { audio: 'AAAA', language: 'en' },
			})
		);
		expect(appendAudio).toHaveBeenCalledWith('AAAA');
		expect(finish).toHaveBeenCalledTimes(1);
	});
});
