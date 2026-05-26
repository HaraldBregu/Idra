/**
 * Unit tests for StoreService (src/main/store/service.ts).
 *
 * electron-store is mocked with an in-memory Map so that the real
 * StoreService logic (case-insensitive lookups, provider upserts,
 * module writes) is exercised without touching the filesystem.
 */

// jest.mock is hoisted before any import declarations, so the factory
// must be entirely self-contained (no references to outer variables).
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
import type { CronStoreState, CronTask } from '../../../../src/shared/cron';
import type { Provider } from '../../../../src/shared/providers';
import type { Model } from '../../../../src/shared/service';

// ---------------------------------------------------------------------------
// Typed accessor for the mocked Store constructor.
// ---------------------------------------------------------------------------

const MockStore = Store as jest.MockedClass<typeof Store>;

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

function createLogger() {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	};
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const openaiProvider: Provider = {
	id: 'openai',
	name: 'OpenAI',
	apiKey: 'sk-old',
	baseUrl: 'https://api.openai.com/v1',
};

const anthropicProvider: Provider = {
	id: 'anthropic',
	name: 'Anthropic',
	apiKey: 'ant-old',
	baseUrl: 'https://api.anthropic.com/v1',
};

const imageProvider: Provider = {
	id: 'black-forest-labs',
	name: 'Black Forest Labs',
	apiKey: 'bfl-old',
	baseUrl: 'https://api.bfl.ai/v1',
	capabilities: 'Image',
};

const textToSpeechProvider: Provider = {
	id: 'elevenlabs',
	name: 'ElevenLabs',
	apiKey: 'eleven-old',
	baseUrl: 'https://api.elevenlabs.io/v1',
};

const videoProvider: Provider = {
	id: 'runway',
	name: 'Runway',
	apiKey: 'runway-old',
	baseUrl: 'https://api.dev.runwayml.com/v1',
};

const musicProvider: Provider = {
	id: 'suno',
	name: 'Suno',
	apiKey: 'suno-old',
	baseUrl: 'https://suno.com',
};

const model: Model = { id: 'gpt-5.4', name: 'GPT-5.4' };
const imageModel: Model = { id: 'FLUX.2', name: 'FLUX.2' };
const textToSpeechModel: Model = { id: 'eleven_v3', name: 'Eleven v3' };
const videoModel: Model = { id: 'gen4.5', name: 'Gen 4.5' };
const musicModel: Model = { id: 'suno-v5.5', name: 'Suno v5.5' };

const cronTask: CronTask = {
	id: 'task-1',
	name: 'task-1',
	schedule: '* * * * *',
	expression: '* * * * *',
	timezone: 'UTC',
	enabled: true,
	status: 'active',
	target: 'job',
	payload: { type: 'message', message: 'Run' },
	data: { type: 'message', message: 'Run' },
	createdAt: '2026-05-22T00:00:00.000Z',
	updatedAt: '2026-05-22T00:00:00.000Z',
	runCount: 0,
	failureCount: 0,
};

const cronScheduler = {
	schemaVersion: 1,
	schedules: [{ id: 'schedule-1' }],
	events: [],
	executions: [],
	locks: {},
	confirmations: [],
	quarantined: [],
} as unknown as CronStoreState;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StoreService', () => {
	beforeEach(() => {
		MockStore.mockClear();
	});

	// -------------------------------------------------------------------------
	// constructor
	// -------------------------------------------------------------------------

	describe('constructor', () => {
		it('constructs the underlying store with name "settings" and dot-notation disabled', () => {
			new StoreService();

			expect(MockStore).toHaveBeenCalledTimes(1);
			expect(MockStore).toHaveBeenCalledWith({
				name: 'settings',
				accessPropertiesByDotNotation: false,
			});
		});
	});

	describe('keep-awake runtime setting', () => {
		it('defaults keep-awake off', () => {
			const service = new StoreService();

			expect(service.getKeepAwakeEnabled()).toBe(false);
		});

		it('does not persist keep-awake state in the settings store', () => {
			const service = new StoreService();
			const store = storeFor(service);

			expect(service.setKeepAwakeEnabled(true)).toEqual({ keepAwakeEnabled: true });
			expect(service.getKeepAwakeEnabled()).toBe(true);
			expect(store.get('appSettings')).toBeUndefined();

			expect(service.setKeepAwakeEnabled(false)).toEqual({ keepAwakeEnabled: false });
			expect(service.getKeepAwakeEnabled()).toBe(false);
		});
	});

	describe('background task settings', () => {
		it('normalizes allowed task policy from the task root', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'task',
				{
					allowedTaskTypes: [' agent.run ', '', 42, 'ocr.run'],
					defaultConcurrency: 2,
				}
			);

			expect(service.getTaskSettings()).toEqual({
				allowedTaskTypes: ['agent.run', 'ocr.run'],
				defaultConcurrency: 2,
			});
		});

		it('persists normalized task settings at the task root', () => {
			const service = new StoreService();
			const store = storeFor(service);

			expect(
				service.setTaskSettings({
					allowedTaskTypes: [' agent.run ', '', 42, 'ocr.run'],
					defaultConcurrency: 0,
				})
			).toEqual({ allowedTaskTypes: ['agent.run', 'ocr.run'] });
			expect(store.get('task')).toEqual({ allowedTaskTypes: ['agent.run', 'ocr.run'] });
		});
	});

	describe('cron settings', () => {
		it('stores cron tasks and scheduler state under the settings cron root', () => {
			const service = new StoreService();
			const store = storeFor(service);

			service.setCronTasks([cronTask]);
			service.setCronSchedulerState(cronScheduler);

			expect(service.getCronTasks()).toEqual([cronTask]);
			expect(service.getCronSchedulerState()).toMatchObject({
				schedules: [{ id: 'schedule-1' }],
			});
			expect(store.get('cron')).toMatchObject({
				tasks: [cronTask],
				scheduler: { schedules: [{ id: 'schedule-1' }] },
			});
		});

		it('normalizes invalid stored cron settings to empty cron state', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('cron', {
				tasks: 'invalid',
				scheduler: {
					schedules: ['invalid'],
					locks: [],
				},
			});

			expect(service.getCronSettings()).toMatchObject({
				tasks: [],
				scheduler: {
					schemaVersion: 1,
					schedules: [],
					events: [],
					executions: [],
					locks: {},
					confirmations: [],
					quarantined: [],
				},
			});
		});
	});

	describe('agent routing settings', () => {
		it('normalizes and stores agent routing settings through the service', () => {
			const service = new StoreService();
			const store = storeFor(service);

			const settings = service.setAgentRoutingSettings({
				agents: [
					{
						id: ' main ',
						default: true,
						name: ' Main agent ',
						model: { providerId: ' OpenAI ', modelId: ' gpt-5.4 ', effort: 'high' },
						skills: [' coding ', 'coding'],
						tools: { profile: 'coding', allow: [' read ', 'read'] },
					},
				],
				bindings: [
					{
						agentId: ' main ',
						match: {
							channel: ' Slack ',
							peer: { kind: 'Direct', id: ' U123 ' },
						},
						session: { scope: 'per-peer' },
					},
				],
			});

			expect(settings).toEqual({
				agents: [
					{
						id: 'main',
						default: true,
						name: 'Main agent',
						model: { providerId: 'openai', modelId: 'gpt-5.4', effort: 'high' },
						skills: ['coding'],
						tools: { profile: 'coding', allow: ['read'] },
					},
				],
				bindings: [
					{
						agentId: 'main',
						match: { channel: 'slack', peer: { kind: 'direct', id: 'U123' } },
						session: { scope: 'per-peer' },
					},
				],
			});
			expect(store.get('agents')).toEqual(settings);
			expect(service.getAgentConfig('main')).toEqual(settings.agents[0]);
		});
	});

	describe('persistence errors', () => {
		it('logs and rethrows read errors from Electron Store', () => {
			const logger = createLogger();
			MockStore.mockImplementationOnce(
				() =>
					({
						get: () => {
							throw new Error('read failed');
						},
						set: jest.fn(),
						delete: jest.fn(),
					}) as never
			);
			const service = new StoreService(logger);

			expect(() => service.getProviders()).toThrow('read failed');
			expect(logger.error).toHaveBeenCalledWith(
				'StoreService',
				'Failed to read settings property',
				{ key: 'providers', error: 'read failed' }
			);
		});

		it('logs and rethrows write errors from Electron Store', () => {
			const logger = createLogger();
			MockStore.mockImplementationOnce(
				() =>
					({
						get: () => [],
						set: () => {
							throw new Error('write failed');
						},
						delete: jest.fn(),
					}) as never
			);
			const service = new StoreService(logger);

			expect(() => service.setTaskSettings({ allowedTaskTypes: ['agent.run'] })).toThrow(
				'write failed'
			);
			expect(logger.error).toHaveBeenCalledWith(
				'StoreService',
				'Failed to write settings property',
				{ key: 'task', error: 'write failed' }
			);
		});
	});

	// -------------------------------------------------------------------------
	// getProviderById
	// -------------------------------------------------------------------------

	describe('getProviderById()', () => {
		it('returns the matching provider when present', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[openaiProvider]
			);

			const result = service.getProviderById('openai');

			expect(result).toMatchObject(openaiProvider);
			expect(result?.capabilities).toContain('Chat');
		});

		it('matches case-insensitively on the queried id', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[openaiProvider]
			);

			// stored as 'openai', queried as 'OpenAI'
			expect(service.getProviderById('OpenAI')).toMatchObject(openaiProvider);
		});

		it('trims whitespace from the queried id before matching', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[openaiProvider]
			);

			expect(service.getProviderById('  openai  ')).toMatchObject(openaiProvider);
		});

		it('trims whitespace from the stored id when matching', () => {
			const paddedProvider: Provider = { ...openaiProvider, id: ' openai ' };
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[paddedProvider]
			);

			expect(service.getProviderById('openai')).toMatchObject({
				...paddedProvider,
				id: 'openai',
			});
		});

		it('returns undefined when no provider matches the given id', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[openaiProvider]
			);

			expect(service.getProviderById('unknown')).toBeUndefined();
		});

		it('returns undefined when the providers key is absent from the store', () => {
			// Store is empty by default (new Map).
			const service = new StoreService();

			expect(service.getProviderById('openai')).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// getOperator
	// -------------------------------------------------------------------------

	describe('getOperator()', () => {
		it('builds operator state from documented module roots', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('providers', [openaiProvider]);
			store.set('assistant', { providerId: 'openai', modelId: model.id });
			store.set('ocr', { mode: 'endpoint', endpoint: 'ocr-url' });

			expect(service.getOperator()).toMatchObject({
				assistant: {
					id: 'friday',
					name: 'Assistant',
					docsPath: 'models/large-language-model.md',
					status: 'implemented',
					provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
					model: expect.objectContaining({ id: model.id }),
				},
			});
			expect(service.getOperator()).not.toHaveProperty('documentReaderOcr');
			expect(service.getOperator()).not.toHaveProperty('rag');
			expect(service.getOperator()).not.toHaveProperty('ocr');
		});

		it('hydrates documented pending media module roots without exposing provider keys', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('providers', [
				{
					id: 'elevenlabs',
					name: 'ElevenLabs',
					apiKey: 'elevenlabs-key',
					baseUrl: 'https://api.elevenlabs.io/v1',
				},
				{
					id: 'runway',
					name: 'Runway',
					apiKey: 'runway-key',
					baseUrl: 'https://api.dev.runwayml.com/v1',
				},
				{
					id: 'suno',
					name: 'Suno',
					apiKey: 'suno-key',
					baseUrl: 'https://api.suno.ai/v1',
				},
			]);
			store.set('textToSpeech', {
				providerId: ' elevenlabs ',
				modelId: ' eleven_v3 ',
			});
			store.set('textToVideo', {
				providerId: ' runway ',
				modelId: ' gen4.5 ',
			});
			store.set('textToSound', {
				providerId: ' suno ',
				modelId: ' suno-v5.5 ',
			});

			const operator = service.getOperator();

			expect(operator).toMatchObject({
				textToSpeech: {
					id: 'text-to-speech',
					docsPath: 'models/text-to-speech.md',
					status: 'pending-runtime',
					provider: {
						id: 'elevenlabs',
						name: 'ElevenLabs',
						baseUrl: 'https://api.elevenlabs.io/v1',
					},
					model: { id: 'eleven_v3', name: 'Eleven v3' },
				},
				videoCreator: {
					id: 'text-to-video',
					docsPath: 'models/text-to-video.md',
					status: 'pending-runtime',
					provider: {
						id: 'runway',
						name: 'Runway',
						baseUrl: 'https://api.dev.runwayml.com/v1',
					},
					model: { id: 'gen4.5', name: 'Gen 4.5' },
				},
				musicCreator: {
					id: 'music-creator',
					docsPath: 'models/music-creator.md',
					status: 'pending-runtime',
					provider: {
						id: 'suno',
						name: 'Suno',
						baseUrl: 'https://api.suno.ai/v1',
					},
					model: { id: 'suno-v5.5', name: 'Suno v5.5' },
				},
			});
			expect(operator?.textToSpeech?.provider).not.toHaveProperty('apiKey');
			expect(operator?.videoCreator?.provider).not.toHaveProperty('apiKey');
			expect(operator?.musicCreator?.provider).not.toHaveProperty('apiKey');
		});

		it('returns undefined when operator state is absent', () => {
			const service = new StoreService();

			expect(service.getOperator()).toBeUndefined();
		});

		it('drops stored module selections with unsupported model ids', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('providers', [
				openaiProvider,
				textToSpeechProvider,
				imageProvider,
				videoProvider,
				musicProvider,
			]);
			store.set('assistant', { providerId: 'openai', modelId: 'gpt-4o' });
			store.set('textToSpeech', { providerId: 'elevenlabs', modelId: 'bad-tts' });
			store.set('imageCreator', { providerId: 'black-forest-labs', modelId: 'bad-image' });
			store.set('textToVideo', { providerId: 'runway', modelId: 'bad-video' });
			store.set('textToSound', { providerId: 'suno', modelId: 'bad-sound' });

			expect(service.getOperator()).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// getAssistantOperator
	// -------------------------------------------------------------------------

	describe('getAssistantOperator()', () => {
		it('returns the assistant block when assistant is set', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('providers', [openaiProvider]);
			store.set('assistant', { providerId: 'openai', modelId: model.id });

			expect(service.getAssistantOperator()).toMatchObject({
				id: 'friday',
				name: 'Assistant',
				docsPath: 'models/large-language-model.md',
				status: 'implemented',
				provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
				model,
			});
		});

		it('returns undefined when operator state is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantOperator()).toBeUndefined();
		});

		it('returns undefined when assistant is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantOperator()).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// getAssistantModel
	// -------------------------------------------------------------------------

	describe('getAssistantModel()', () => {
		it('returns the model when assistant is set', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('providers', [openaiProvider]);
			store.set('assistant', { providerId: 'openai', modelId: model.id });

			expect(service.getAssistantModel()).toEqual(model);
		});

		it('returns undefined when operator state is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantModel()).toBeUndefined();
		});

		it('returns undefined when assistant is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantModel()).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// getAssistantProvider
	// -------------------------------------------------------------------------

	describe('getAssistantProvider()', () => {
		it('returns the provider block when assistant is set', () => {
			const providerRef = { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' };
			const service = new StoreService();
			const store = storeFor(service);
			store.set('providers', [openaiProvider]);
			store.set('assistant', { providerId: 'openai', modelId: model.id });

			const provider = service.getAssistantProvider();
			expect(provider).toMatchObject(providerRef);
			expect(provider).not.toHaveProperty('apiKey');
			expect(provider?.capabilities).toContain('Chat');
			expect(provider?.apiConfiguration).toBeDefined();
		});

		it('returns undefined when operator state is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantProvider()).toBeUndefined();
		});

		it('returns undefined when assistant is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantProvider()).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// setAssistantOperator
	// -------------------------------------------------------------------------

	describe('setAssistantOperator()', () => {
		it('returns false and does not write when the provider id is not found', () => {
			const service = new StoreService();

			const result = service.setAssistantOperator('unknown', model);

			expect(result).toBe(false);
			expect(service.getOperator()).toBeUndefined();
		});

		it('returns true and writes the assistant operator when the provider is found', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[openaiProvider]
			);

			const result = service.setAssistantOperator('openai', model);

			expect(result).toBe(true);
			expect(service.getOperator()?.assistant).toBeDefined();
		});

		it('preserves safe assistant options when changing the assistant model', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('providers', [openaiProvider]);
			store.set('assistant', {
				providerId: 'openai',
				modelId: 'old-model',
				options: { agents: { defaultAgentId: 'main' } },
			});

			service.setAssistantOperator('openai', model);

			expect(store.get('assistant')).toEqual({
				providerId: 'openai',
				modelId: 'gpt-5.4',
				options: { agents: { defaultAgentId: 'main' } },
			});
		});

		it('does not create rag and ocr fields when no current operator state exists', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[openaiProvider]
			);

			service.setAssistantOperator('openai', model);

			const written = service.getOperator();
			expect(written?.rag).toBeUndefined();
			expect(written?.ocr).toBeUndefined();
		});

		it('writes the provider without the apiKey field', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[openaiProvider]
			);

			service.setAssistantOperator('openai', model);

			const written = service.getOperator();
			expect(written?.assistant?.provider).not.toHaveProperty('apiKey');
			expect(written?.assistant?.provider).toMatchObject({
				id: 'openai',
				name: 'OpenAI',
				baseUrl: 'https://api.openai.com/v1',
				capabilities: expect.stringContaining('Chat'),
				apiConfiguration: expect.objectContaining({ credentialType: 'API key' }),
			});
		});

		it('forwards the model as-is to the written service', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[openaiProvider]
			);

			service.setAssistantOperator('openai', model);

			expect(service.getOperator()?.assistant?.model).toEqual(model);
		});

		it('persists the compact agent module selection at the root', () => {
			const service = new StoreService();
			const store = (
				service as unknown as {
					store: { get: (k: string) => unknown; set: (k: string, v: unknown) => void };
				}
			).store;
			store.set('providers', [openaiProvider]);

			service.setAssistantOperator('openai', { ...model, effort: 'high' });

			expect(store.get('assistant')).toEqual({
				providerId: 'openai',
				modelId: 'gpt-5.4',
				effort: 'high',
			});
			expect(store.get('agent')).toBeUndefined();
			expect(store.get('service')).toBeUndefined();
		});
	});

	describe('setImageCreatorOperator()', () => {
		it('persists the compact imageCreator module selection at the root', () => {
			const service = new StoreService();
			const store = (
				service as unknown as {
					store: { get: (k: string) => unknown; set: (k: string, v: unknown) => void };
				}
			).store;
			store.set('providers', [imageProvider]);

			const result = service.setImageCreatorOperator('black-forest-labs', imageModel);

			expect(result).toBe(true);
			expect(store.get('imageCreator')).toEqual({
				providerId: 'black-forest-labs',
				modelId: 'FLUX.2',
			});
			expect(store.get('service')).toBeUndefined();
		});

		it('preserves imageCreator options when changing the image model', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('providers', [imageProvider]);
			store.set('imageCreator', {
				providerId: 'black-forest-labs',
				modelId: 'old-image-model',
				options: { size: '1024x1024' },
			});

			service.setImageCreatorOperator('black-forest-labs', imageModel);

			expect(store.get('imageCreator')).toEqual({
				providerId: 'black-forest-labs',
				modelId: 'FLUX.2',
				options: { size: '1024x1024' },
			});
		});

		it('returns the image creator operator without exposing the provider api key', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[imageProvider]
			);

			service.setImageCreatorOperator('black-forest-labs', imageModel);

			expect(service.getImageCreatorOperator()).toMatchObject({
				id: 'image-assistant',
				provider: {
					id: 'black-forest-labs',
					name: 'Black Forest Labs',
					baseUrl: 'https://api.bfl.ai/v1',
				},
				model: imageModel,
			});
			expect(service.getImageCreatorOperator()?.provider).not.toHaveProperty('apiKey');
		});

		it('rejects providers without image capability', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[anthropicProvider]
			);

			expect(service.setImageCreatorOperator('anthropic', imageModel)).toBe(false);
			expect(service.getImageCreatorOperator()).toBeUndefined();
		});

		it('rejects unsupported image model ids', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[imageProvider]
			);

			expect(service.setImageCreatorOperator('black-forest-labs', model)).toBe(false);
			expect(service.getImageCreatorOperator()).toBeUndefined();
		});
	});

	describe('pending runtime model operators', () => {
		it('persists compact text-to-speech, video, and text-to-sound selections', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('providers', [textToSpeechProvider, videoProvider, musicProvider]);

			expect(service.setTextToSpeechOperator('elevenlabs', textToSpeechModel)).toBe(true);
			expect(service.setTextToVideoOperator('runway', videoModel)).toBe(true);
			expect(service.setTextToSoundOperator('suno', musicModel)).toBe(true);

			expect(store.get('textToSpeech')).toEqual({
				providerId: 'elevenlabs',
				modelId: 'eleven_v3',
			});
			expect(store.get('textToVideo')).toEqual({
				providerId: 'runway',
				modelId: 'gen4.5',
			});
			expect(store.get('textToSound')).toEqual({
				providerId: 'suno',
				modelId: 'suno-v5.5',
			});
			expect(service.getTextToSpeechOperator()).toMatchObject({
				id: 'text-to-speech',
				provider: { id: 'elevenlabs', name: 'ElevenLabs' },
				model: textToSpeechModel,
			});
			expect(service.getTextToVideoOperator()).toMatchObject({
				id: 'text-to-video',
				provider: { id: 'runway', name: 'Runway' },
				model: videoModel,
			});
			expect(service.getTextToSoundOperator()).toMatchObject({
				id: 'music-creator',
				provider: { id: 'suno', name: 'Suno' },
				model: musicModel,
			});
			expect(service.getTextToSoundOperator()?.provider).not.toHaveProperty('apiKey');
		});

		it('rejects unsupported pending-runtime model selections', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('providers', [textToSpeechProvider, videoProvider, anthropicProvider]);

			expect(service.setTextToSpeechOperator('elevenlabs', model)).toBe(false);
			expect(service.setTextToVideoOperator('runway', model)).toBe(false);
			expect(service.setTextToSoundOperator('anthropic', musicModel)).toBe(false);
			expect(service.getTextToSpeechOperator()).toBeUndefined();
			expect(service.getTextToVideoOperator()).toBeUndefined();
			expect(service.getTextToSoundOperator()).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// setOpenAiApiKey
	// -------------------------------------------------------------------------

	describe('setOpenAiApiKey()', () => {
		it('adds a new openai provider when none exists', () => {
			const service = new StoreService();
			const store = storeFor(service);

			service.setOpenAiApiKey('sk-new');

			const provider = service.getProviderById('openai');
			expect(provider).toMatchObject({
				id: 'openai',
				name: 'OpenAI',
				apiKey: 'sk-new',
				baseUrl: 'https://api.openai.com/v1',
			});
			expect(store.get('providers')).toEqual([
				{
					id: 'openai',
					name: 'OpenAI',
					apiKey: 'sk-new',
					baseUrl: 'https://api.openai.com/v1',
				},
			]);
		});

		it('replaces the existing openai provider in place (array length stays the same)', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[openaiProvider, anthropicProvider]
			);

			service.setOpenAiApiKey('sk-updated');

			const providers = service.getProviderById('openai');
			expect(providers?.apiKey).toBe('sk-updated');
			// anthropic must still be present
			expect(service.getProviderById('anthropic')).toMatchObject(anthropicProvider);
		});

		it('replaces by case-insensitive id match (stored id "OpenAI")', () => {
			const mixedCase: Provider = { ...openaiProvider, id: 'OpenAI' };
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[mixedCase]
			);

			service.setOpenAiApiKey('sk-case');

			// After replacement the canonical id written by setOpenAiApiKey is 'openai'
			const provider = service.getProviderById('openai');
			expect(provider?.apiKey).toBe('sk-case');
			expect(provider?.id).toBe('openai');
		});

		it('writes the canonical openai provider shape regardless of what was stored', () => {
			const service = new StoreService();

			service.setOpenAiApiKey('sk-canonical');

			expect(service.getProviderById('openai')).toMatchObject({
				id: 'openai',
				name: 'OpenAI',
				apiKey: 'sk-canonical',
				baseUrl: 'https://api.openai.com/v1',
			});
		});
	});

	// -------------------------------------------------------------------------
	// setAnthropicApiKey
	// -------------------------------------------------------------------------

	describe('setAnthropicApiKey()', () => {
		it('adds a new anthropic provider when none exists', () => {
			const service = new StoreService();
			const store = storeFor(service);

			service.setAnthropicApiKey('ant-new');

			const provider = service.getProviderById('anthropic');
			expect(provider).toMatchObject({
				id: 'anthropic',
				name: 'Anthropic',
				apiKey: 'ant-new',
				baseUrl: 'https://api.anthropic.com/v1',
			});
			expect(store.get('providers')).toEqual([
				{
					id: 'anthropic',
					name: 'Anthropic',
					apiKey: 'ant-new',
					baseUrl: 'https://api.anthropic.com/v1',
				},
			]);
		});

		it('replaces the existing anthropic provider in place (array length stays the same)', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[openaiProvider, anthropicProvider]
			);

			service.setAnthropicApiKey('ant-updated');

			expect(service.getProviderById('anthropic')?.apiKey).toBe('ant-updated');
			// openai must still be present
			expect(service.getProviderById('openai')).toMatchObject(openaiProvider);
		});

		it('replaces by case-insensitive id match (stored id "Anthropic")', () => {
			const mixedCase: Provider = { ...anthropicProvider, id: 'Anthropic' };
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'providers',
				[mixedCase]
			);

			service.setAnthropicApiKey('ant-case');

			// After replacement the canonical id written by setAnthropicApiKey is 'anthropic'
			const provider = service.getProviderById('anthropic');
			expect(provider?.apiKey).toBe('ant-case');
			expect(provider?.id).toBe('anthropic');
		});

		it('writes the canonical anthropic provider shape regardless of what was stored', () => {
			const service = new StoreService();

			service.setAnthropicApiKey('ant-canonical');

			expect(service.getProviderById('anthropic')).toMatchObject({
				id: 'anthropic',
				name: 'Anthropic',
				apiKey: 'ant-canonical',
				baseUrl: 'https://api.anthropic.com/v1',
			});
		});
	});
});
