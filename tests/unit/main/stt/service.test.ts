jest.mock('@mistralai/mistralai', () => ({
	Mistral: jest.fn(() => ({ audio: { transcriptions: { complete: jest.fn() } } })),
}));

import { SttService } from '../../../../src/main/services/stt-service';
import type { SttServiceOptions } from '../../../../src/main/services/stt-service';
import { SttAdapterFactory } from '../../../../src/main/stt/factory';
import type { SttAdapter } from '../../../../src/main/stt/types';
import { SttProviderAuthError, SttProviderUnsupportedError } from '../../../../src/main/stt/errors';

const audio = {
	data: Buffer.from('audio').toString('base64'),
	encoding: 'base64' as const,
	mimeType: 'audio/wav',
	fileName: 'audio.wav',
};

function sttStore(provider?: {
	id: string;
	name: string;
	apiKey: string;
	baseUrl: string;
	modelId?: string;
}): SttServiceOptions['store'] {
	const state = {
		providerId: provider?.id,
		modelId: provider?.modelId,
		providers: provider
			? {
					[provider.id]: {
						name: provider.name,
						apiKey: provider.apiKey,
						baseUrl: provider.baseUrl,
					},
				}
			: {},
	};
	return {
		get: jest.fn((key: keyof typeof state) => state[key]),
		set: jest.fn((key: keyof typeof state, value: (typeof state)[keyof typeof state]) => {
			state[key] = value as never;
		}),
	} as SttServiceOptions['store'];
}

describe('SttService', () => {
	it('ignores the TypeDI container argument when runtime metadata is unavailable', () => {
		const service = new SttService({} as never, { store: sttStore() });
		const internals = service as unknown as { adapterFactory: SttAdapterFactory };

		expect(internals.adapterFactory).toBeInstanceOf(SttAdapterFactory);
	});

	it('normalizes requests and sends them through the selected provider adapter', async () => {
		const adapter: SttAdapter = {
			transcribe: jest.fn(async (request) => ({
				text: 'hello',
				metadata: {
					providerId: request.providerId,
					providerName: 'Mistral',
					modelId: request.modelId,
					createdAt: '2026-06-12T00:00:00.000Z',
				},
			})),
		};
		const factory = {
			build: jest.fn(() => adapter),
		} as unknown as SttAdapterFactory;
		const store = sttStore({
			id: 'mistral',
			name: 'Mistral',
			apiKey: 'test-key',
			baseUrl: 'https://api.mistral.ai/v1',
		});
		const service = new SttService(factory, { store });

		const result = await service.transcribe({
			audio,
			providerId: 'mistral',
			modelId: 'voxtral-mini-latest',
			language: ' en ',
		});

		expect(result.text).toBe('hello');
		expect(factory.build).toHaveBeenCalledWith({
			id: 'mistral',
			name: 'Mistral',
			apiKey: 'test-key',
			baseURL: 'https://api.mistral.ai/v1',
		});
		expect(adapter.transcribe).toHaveBeenCalledWith(
			expect.objectContaining({
				providerId: 'mistral',
				modelId: 'voxtral-mini-latest',
				language: 'en',
			})
		);
	});

	it('uses the provider default batch model when modelId is omitted', async () => {
		const adapter: SttAdapter = {
			transcribe: jest.fn(async (request) => ({
				text: '',
				metadata: {
					providerId: request.providerId,
					providerName: 'Deepgram',
					modelId: request.modelId,
					createdAt: '2026-06-12T00:00:00.000Z',
				},
			})),
		};
		const factory = { build: jest.fn(() => adapter) } as unknown as SttAdapterFactory;
		const store = sttStore({
			id: 'deepgram',
			name: 'Deepgram',
			apiKey: 'test-key',
			baseUrl: 'https://api.deepgram.com/v1',
		});
		const service = new SttService(factory, { store });

		await service.transcribe({ audio, providerId: 'deepgram' });

		expect(adapter.transcribe).toHaveBeenCalledWith(
			expect.objectContaining({
				providerId: 'deepgram',
				modelId: 'nova-3',
			})
		);
	});

	it('rejects streaming-only speech-to-text models for the batch API', async () => {
		const service = new SttService(
			{ build: jest.fn() } as unknown as SttAdapterFactory,
			{
				store: sttStore({
					id: 'qwen',
					name: 'Qwen',
					apiKey: 'test-key',
					baseUrl: 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime',
				}),
			}
		);

		await expect(
			service.transcribe({ audio, providerId: 'qwen', modelId: 'qwen3-asr-flash-realtime' })
		).rejects.toThrow(SttProviderUnsupportedError);
	});

	it('starts realtime sessions with stream-capable models', async () => {
		const connection = {
			appendAudio: jest.fn(async () => undefined),
			finish: jest.fn(async () => undefined),
			cancel: jest.fn(async () => undefined),
		};
		const adapter: SttAdapter = {
			transcribe: jest.fn(),
			startRealtime: jest.fn(async () => connection),
		};
		const factory = { build: jest.fn(() => adapter) } as unknown as SttAdapterFactory;
		const store = sttStore({
			id: 'openai',
			name: 'OpenAI',
			apiKey: 'test-key',
			baseUrl: 'https://api.openai.com/v1',
		});
		const service = new SttService(factory, { store });
		const events: unknown[] = [];

		const session = await service.startRealtime(
			{ providerId: 'openai', modelId: 'gpt-realtime-whisper', language: ' en ' },
			(event) => events.push(event)
		);

		expect(session.providerId).toBe('openai');
		expect(session.modelId).toBe('gpt-realtime-whisper');
		expect(session.sampleRate).toBe(24_000);
		expect(adapter.startRealtime).toHaveBeenCalledWith(
			expect.objectContaining({
				sessionId: session.id,
				providerId: 'openai',
				modelId: 'gpt-realtime-whisper',
				language: 'en',
				sampleRate: 24_000,
			}),
			expect.any(Function)
		);
		expect(events).toContainEqual({
			type: 'started',
			sessionId: session.id,
			providerId: 'openai',
			model: 'gpt-realtime-whisper',
		});
	});

	it('routes realtime audio lifecycle calls to the active session', async () => {
		const connection = {
			appendAudio: jest.fn(async () => undefined),
			finish: jest.fn(async () => undefined),
			cancel: jest.fn(async () => undefined),
		};
		const adapter: SttAdapter = {
			transcribe: jest.fn(),
			startRealtime: jest.fn(async () => connection),
		};
		const service = new SttService(
			{ build: jest.fn(() => adapter) } as unknown as SttAdapterFactory,
			{
				store: sttStore({
					id: 'deepgram',
					name: 'Deepgram',
					apiKey: 'test-key',
					baseUrl: 'https://api.deepgram.com/v1',
				}),
			}
		);

		const session = await service.startRealtime({ providerId: 'deepgram' }, jest.fn());
		await service.appendRealtimeAudio(session.id, Buffer.from('audio').toString('base64'));
		await service.finishRealtime(session.id);
		await service.cancelRealtime(session.id);

		expect(connection.appendAudio).toHaveBeenCalledWith(Buffer.from('audio').toString('base64'));
		expect(connection.finish).toHaveBeenCalledTimes(1);
		expect(connection.cancel).toHaveBeenCalledTimes(1);
	});

	it('rejects batch-only models for realtime sessions', async () => {
		const service = new SttService(
			{ build: jest.fn() } as unknown as SttAdapterFactory,
			{
				store: sttStore({
					id: 'xai',
					name: 'xAI',
					apiKey: 'test-key',
					baseUrl: 'https://api.x.ai/v1',
				}),
			}
		);

		await expect(
			service.startRealtime({ providerId: 'xai', modelId: 'xai-stt-batch' }, jest.fn())
		).rejects.toThrow(SttProviderUnsupportedError);
	});

	it('requires a configured API key', async () => {
		const service = new SttService(
			{ build: jest.fn() } as unknown as SttAdapterFactory,
			{
				store: sttStore({
					id: 'openai',
					name: 'OpenAI',
					apiKey: '',
					baseUrl: 'https://api.openai.com/v1',
				}),
			}
		);

		await expect(
			service.transcribe({
				audio,
				providerId: 'openai',
				modelId: 'gpt-4o-transcribe',
			})
		).rejects.toThrow(SttProviderAuthError);
	});
});
