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
import { SpeechToTextService } from '../../../../src/main/stt';
import type { ConfiguredModelOperator, Model } from '../../../../src/shared/agents/service';
import type {
	RealtimeTranscriptionEvent,
	RealtimeTranscriptionSession,
	RealtimeTranscriptionStartRequest,
} from '../../../../src/shared/realtime-transcription';
import { REALTIME_TRANSCRIPTION_SAMPLE_RATE } from '../../../../src/shared/service';
import type { Provider } from '../../../../src/shared/providers';
import { REALTIME_SPEECH_TRANSCRIBER_MODEL_ID } from '../../../../src/shared/provider-models';

const MockStore = Store as jest.MockedClass<typeof Store>;

const openaiProvider: Provider = {
	id: 'openai',
	name: 'OpenAI',
	baseUrl: 'https://api.openai.com/v1',
	apiKey: 'sk-test',
};

interface FakeRuntimeConfig {
	sessionId: string;
	provider: Provider;
	operator: ConfiguredModelOperator;
	model: Model;
	request?: RealtimeTranscriptionStartRequest;
	callbacks: {
		emit: (event: RealtimeTranscriptionEvent) => void;
		closed: (sessionId: string) => void;
	};
}

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

function configureSpeechToText(
	store: StoreService,
	provider: Provider = openaiProvider,
	modelId = REALTIME_SPEECH_TRANSCRIBER_MODEL_ID
): void {
	const settings = storeFor(store);
	settings.set('providers', [provider]);
	settings.set('speechToText', {
		providerId: provider.id,
		modelId,
	});
}

function createOwner(id = 1): {
	webContents: {
		id: number;
		once: jest.Mock;
		isDestroyed: jest.Mock;
		send: jest.Mock;
	};
	destroy: () => void;
} {
	let onDestroyed: (() => void) | undefined;
	const webContents = {
		id,
		once: jest.fn((event: string, listener: () => void) => {
			if (event === 'destroyed') onDestroyed = listener;
		}),
		isDestroyed: jest.fn(() => false),
		send: jest.fn(),
	};
	return {
		webContents,
		destroy: () => {
			onDestroyed?.();
		},
	};
}

function createAdapter(options: {
	providerId?: string;
	modelId?: string;
	finish?: (config: FakeRuntimeConfig) => void;
	startError?: Error;
} = {}): {
	adapter: {
		supports: jest.Mock;
		startSession: jest.Mock;
	};
	appendAudio: jest.Mock;
	finish: jest.Mock;
	cancel: jest.Mock;
	close: jest.Mock;
} {
	const providerId = options.providerId ?? openaiProvider.id;
	const modelId = options.modelId ?? REALTIME_SPEECH_TRANSCRIBER_MODEL_ID;
	const appendAudio = jest.fn();
	const finish = jest.fn();
	const cancel = jest.fn();
	const close = jest.fn();
	return {
		appendAudio,
		finish,
		cancel,
		close,
		adapter: {
			supports: jest.fn((candidateProviderId: string, candidateModelId: string) => {
				return candidateProviderId === providerId && candidateModelId === modelId;
			}),
			startSession: jest.fn(async (config: FakeRuntimeConfig) => {
				if (options.startError) throw options.startError;
				const session: RealtimeTranscriptionSession = {
					id: config.sessionId,
					model: config.model.id,
					sampleRate: REALTIME_TRANSCRIPTION_SAMPLE_RATE,
				};
				config.callbacks.emit({
					type: 'started',
					sessionId: config.sessionId,
					model: config.model.id,
				});
				return {
					...session,
					start: jest.fn(async () => session),
					appendAudio,
					finish: () => {
						finish();
						if (options.finish) {
							options.finish(config);
						} else {
							config.callbacks.closed(config.sessionId);
						}
					},
					cancel: () => {
						cancel();
						config.callbacks.closed(config.sessionId);
					},
					close: () => {
						close();
						config.callbacks.closed(config.sessionId);
					},
				};
			}),
		},
	};
}

describe('SpeechToTextService', () => {
	beforeEach(() => {
		MockStore.mockClear();
	});

	it('creates, reads, appends, finishes, and cancels sessions through StoreService settings', async () => {
		const store = new StoreService();
		configureSpeechToText(store);
		const getSettings = jest.spyOn(store, 'getSpeechToTextSettings');
		const getOperator = jest.spyOn(store, 'getSpeechToTextOperator');
		const getProvider = jest.spyOn(store, 'getProviderById');
		const fake = createAdapter();
		const service = new SpeechToTextService({
			store,
			adapters: [fake.adapter],
		});
		const owner = createOwner();

		const session = await service.start(owner.webContents as never, { language: 'en' }, {
			eventChannel: 'speech:event',
		});

		expect(session).toMatchObject({
			model: REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
			sampleRate: REALTIME_TRANSCRIPTION_SAMPLE_RATE,
		});
		expect(service.getSession(owner.webContents as never, session.id)).toEqual(session);
		expect(owner.webContents.send).toHaveBeenCalledWith('speech:event', {
			type: 'started',
			sessionId: session.id,
			model: REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
		});
		service.appendAudio(owner.webContents as never, session.id, 'AAAA');
		expect(fake.appendAudio).toHaveBeenCalledWith('AAAA');
		service.finish(owner.webContents as never, session.id);
		expect(fake.finish).toHaveBeenCalledTimes(1);
		expect(() => service.getSession(owner.webContents as never, session.id)).toThrow(
			'Realtime transcription session was not found.'
		);

		const cancelled = await service.start(owner.webContents as never);
		service.cancel(owner.webContents as never, cancelled.id);
		expect(fake.cancel).toHaveBeenCalledTimes(1);
		expect(() => service.getSession(owner.webContents as never, cancelled.id)).toThrow(
			'Realtime transcription session was not found.'
		);
		expect(getSettings).toHaveBeenCalled();
		expect(getOperator).toHaveBeenCalled();
		expect(getProvider).toHaveBeenCalledWith('openai');
	});

	it('closes active sessions when the owner is destroyed or the service is destroyed', async () => {
		const store = new StoreService();
		configureSpeechToText(store);
		const fake = createAdapter();
		const service = new SpeechToTextService({ store, adapters: [fake.adapter] });
		const owner = createOwner();
		const session = await service.start(owner.webContents as never);

		owner.destroy();

		expect(fake.close).toHaveBeenCalledTimes(1);
		expect(() => service.getSession(owner.webContents as never, session.id)).toThrow(
			'Realtime transcription session was not found.'
		);

		const remaining = await service.start(owner.webContents as never);
		service.destroy();

		expect(fake.close).toHaveBeenCalledTimes(2);
		expect(() => service.getSession(owner.webContents as never, remaining.id)).toThrow(
			'Realtime transcription session was not found.'
		);
	});

	it('rejects missing, invalid, and incomplete StoreService speech-to-text settings', async () => {
		const owner = createOwner();
		const missing = new SpeechToTextService({
			store: new StoreService(),
			adapters: [createAdapter().adapter],
		});

		await expect(missing.start(owner.webContents as never)).rejects.toThrow(
			'Speech-to-text is not configured.'
		);

		const invalidStore = new StoreService();
		configureSpeechToText(invalidStore, openaiProvider, 'bad-stt-model');
		const invalidAdapter = createAdapter();
		const invalid = new SpeechToTextService({
			store: invalidStore,
			adapters: [invalidAdapter.adapter],
		});

		await expect(invalid.start(owner.webContents as never)).rejects.toThrow(
			'Model is not supported for speech-to-text: bad-stt-model'
		);
		expect(invalidAdapter.adapter.startSession).not.toHaveBeenCalled();

		const missingKeyStore = new StoreService();
		configureSpeechToText(missingKeyStore, { ...openaiProvider, apiKey: '' });
		const missingKey = new SpeechToTextService({
			store: missingKeyStore,
			adapters: [createAdapter().adapter],
		});

		await expect(missingKey.start(owner.webContents as never)).rejects.toThrow(
			'API key missing for speech-to-text provider: openai'
		);
	});

	it('transcribes recorded audio through the configured provider adapter', async () => {
		const store = new StoreService();
		configureSpeechToText(store);
		const fake = createAdapter({
			finish: (config) => {
				config.callbacks.emit({
					type: 'completed',
					sessionId: config.sessionId,
					itemId: 'item-1',
					contentIndex: 0,
					transcript: 'hello world',
				});
				config.callbacks.closed(config.sessionId);
			},
		});
		const service = new SpeechToTextService({ store, adapters: [fake.adapter] });

		await expect(service.transcribe({ audio: 'AAAA', language: 'en' })).resolves.toEqual({
			model: REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
			transcript: 'hello world',
		});
		expect(fake.appendAudio).toHaveBeenCalledWith('AAAA');
		expect(fake.finish).toHaveBeenCalledTimes(1);
		expect(fake.adapter.startSession).toHaveBeenCalledWith(
			expect.objectContaining({
				provider: openaiProvider,
				model: { id: REALTIME_SPEECH_TRANSCRIBER_MODEL_ID, name: 'GPT realtime transcriber' },
				request: { audio: 'AAAA', language: 'en' },
			})
		);
	});

	it('rejects provider failures and closes the failed transcription session', async () => {
		const store = new StoreService();
		configureSpeechToText(store);
		const fake = createAdapter({
			finish: (config) => {
				config.callbacks.emit({
					type: 'error',
					sessionId: config.sessionId,
					message: 'provider unavailable',
				});
			},
		});
		const service = new SpeechToTextService({ store, adapters: [fake.adapter] });

		await expect(service.transcribe({ audio: 'AAAA' })).rejects.toThrow('provider unavailable');
		expect(fake.close).toHaveBeenCalledTimes(1);
	});
});
