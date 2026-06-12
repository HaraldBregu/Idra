jest.mock('@mistralai/mistralai', () => ({
	Mistral: jest.fn(() => ({ audio: { transcriptions: { complete: jest.fn() } } })),
}));

import { SttService } from '../../../../src/main/services/stt-service';
import type { SttAdapterFactory } from '../../../../src/main/stt/factory';
import type { SttAdapter } from '../../../../src/main/stt/types';
import { SttProviderAuthError, SttProviderUnsupportedError } from '../../../../src/main/stt/errors';

const audio = {
	data: Buffer.from('audio').toString('base64'),
	encoding: 'base64' as const,
	mimeType: 'audio/wav',
	fileName: 'audio.wav',
};

describe('SttService', () => {
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
		const store = {
			get: jest.fn(() => ({
				name: 'Mistral',
				apiKey: 'test-key',
				baseUrl: 'https://api.mistral.ai/v1',
			})),
		};
		const service = new SttService(factory, store as never);

		const result = await service.transcribe({
			audio,
			providerId: 'mistral',
			modelId: 'voxtral-mini-2602',
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
				modelId: 'voxtral-mini-2602',
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
		const store = {
			get: jest.fn(() => ({
				name: 'Deepgram',
				apiKey: 'test-key',
				baseUrl: 'https://api.deepgram.com/v1',
			})),
		};
		const service = new SttService(factory, store as never);

		await service.transcribe({ audio, providerId: 'deepgram' });

		expect(adapter.transcribe).toHaveBeenCalledWith(
			expect.objectContaining({
				providerId: 'deepgram',
				modelId: 'nova-3',
			})
		);
	});

	it('rejects streaming-only speech-to-text models for the batch API', async () => {
		const service = new SttService({ build: jest.fn() } as unknown as SttAdapterFactory, {
			get: jest.fn(),
		} as never);

		await expect(
			service.transcribe({ audio, providerId: 'qwen', modelId: 'qwen3.5-omni' })
		).rejects.toThrow(SttProviderUnsupportedError);
	});

	it('requires a configured API key', async () => {
		const originalOpenAiKey = process.env.OPENAI_API_KEY;
		delete process.env.OPENAI_API_KEY;
		const service = new SttService({ build: jest.fn() } as unknown as SttAdapterFactory, {
			get: jest.fn(() => undefined),
		} as never);

		try {
			await expect(
				service.transcribe({
					audio,
					providerId: 'openai',
					modelId: 'gpt-4o-transcribe',
				})
			).rejects.toThrow(SttProviderAuthError);
		} finally {
			if (originalOpenAiKey === undefined) {
				delete process.env.OPENAI_API_KEY;
			} else {
				process.env.OPENAI_API_KEY = originalOpenAiKey;
			}
		}
	});
});
