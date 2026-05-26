jest.mock('electron-store', () => {
	return jest.fn().mockImplementation(() => {
		const data = new Map<string, unknown>();
		return {
			get: (key: string) => data.get(key),
			set: (key: string, value: unknown) => {
				data.set(key, value);
			},
			delete: (key: string) => {
				data.delete(key);
			},
		};
	});
});

import Store from 'electron-store';
import { StoreService } from '../../../../src/main/store';
import { TextToSpeechService } from '../../../../src/main/tts';
import type { Provider } from '../../../../src/shared/providers';

const MockStore = Store as jest.MockedClass<typeof Store>;

const openaiProvider: Provider = {
	id: 'openai',
	name: 'OpenAI',
	baseUrl: 'https://api.openai.com/v1',
	apiKey: 'sk-test',
};

function storeFor(service: StoreService): {
	get: (key: string) => unknown;
	set: (key: string, value: unknown) => void;
} {
	return (
		service as unknown as {
			store: { get: (key: string) => unknown; set: (key: string, value: unknown) => void };
		}
	).store;
}

function audioResponse(bytes: number[], contentType = 'audio/mpeg'): Response {
	return {
		ok: true,
		status: 200,
		statusText: 'OK',
		headers: {
			get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
		},
		arrayBuffer: async () => Uint8Array.from(bytes).buffer,
		text: async () => '',
	} as unknown as Response;
}

function errorResponse(status: number, body: string): Response {
	return {
		ok: false,
		status,
		statusText: 'Provider error',
		headers: {
			get: () => null,
		},
		arrayBuffer: async () => Uint8Array.from([]).buffer,
		text: async () => body,
	} as unknown as Response;
}

function configureTextToSpeech(
	store: StoreService,
	provider: Provider = openaiProvider,
	modelId = 'gpt-4o-mini-tts',
	options: Record<string, unknown> = { voiceId: 'verse' }
): void {
	const settings = storeFor(store);
	settings.set('providers', [provider]);
	settings.set('textToSpeech', {
		providerId: provider.id,
		modelId,
		options,
	});
}

describe('TextToSpeechService', () => {
	beforeEach(() => {
		MockStore.mockClear();
	});

	it('resolves settings through StoreService and synthesizes renderer-safe audio', async () => {
		const store = new StoreService();
		configureTextToSpeech(store);
		const fetchMock = jest.fn(async () => audioResponse([1, 2, 3]));
		const service = new TextToSpeechService({
			store,
			fetch: fetchMock as unknown as typeof fetch,
		});

		const result = await service.synthesize({ text: ' Say hello ' });

		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.openai.com/v1/audio/speech',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					Authorization: 'Bearer sk-test',
					'Content-Type': 'application/json',
				}),
				body: JSON.stringify({
					model: 'gpt-4o-mini-tts',
					input: 'Say hello',
					voice: 'verse',
					response_format: 'mp3',
				}),
			})
		);
		expect(result).toMatchObject({
			audio: {
				data: 'AQID',
				encoding: 'base64',
				mimeType: 'audio/mpeg',
				byteLength: 3,
			},
			metadata: {
				providerId: 'openai',
				providerName: 'OpenAI',
				modelId: 'gpt-4o-mini-tts',
				modelName: 'GPT-4o Mini TTS',
				format: 'mp3',
				voiceId: 'verse',
				createdAt: expect.any(String),
			},
		});
		expect(JSON.parse(JSON.stringify(result))).toEqual(result);
	});

	it('rejects missing text-to-speech settings', async () => {
		const service = new TextToSpeechService({
			store: new StoreService(),
			clients: [],
		});

		await expect(service.synthesize('hello')).rejects.toThrow('Text-to-speech is not configured.');
	});

	it('rejects invalid settings before provider synthesis', async () => {
		const store = new StoreService();
		configureTextToSpeech(store, openaiProvider, 'bad-tts-model');
		const fetchMock = jest.fn();
		const service = new TextToSpeechService({
			store,
			fetch: fetchMock as unknown as typeof fetch,
		});

		await expect(service.synthesize('hello')).rejects.toThrow(
			'Model is not supported for text-to-speech: bad-tts-model'
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects missing provider API keys before synthesis', async () => {
		const store = new StoreService();
		configureTextToSpeech(store, { ...openaiProvider, apiKey: '' });
		const service = new TextToSpeechService({ store, clients: [] });

		await expect(service.synthesize('hello')).rejects.toThrow(
			'API key missing for text-to-speech provider: openai'
		);
	});

	it('surfaces provider failure behavior without returning audio', async () => {
		const store = new StoreService();
		configureTextToSpeech(store);
		const fetchMock = jest.fn(async () => errorResponse(429, 'rate limited'));
		const service = new TextToSpeechService({
			store,
			fetch: fetchMock as unknown as typeof fetch,
		});

		await expect(service.synthesize('hello')).rejects.toThrow(
			'Text-to-speech provider failed: OpenAI text-to-speech failed (429): rate limited'
		);
	});
});
