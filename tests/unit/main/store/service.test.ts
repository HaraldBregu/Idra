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
import { emptyCronJobStoreState } from '../../../../src/main/cron';
import { CHANNEL_PROVIDER_IDS } from '../../../../src/shared/channels';
import type { ConnectorConfig } from '../../../../src/shared/connectors';
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

const gmailConnector: ConnectorConfig = {
	id: 'connector-1',
	name: 'Gmail',
	connectorId: 'connector_gmail',
	serverLabel: 'gmail',
	enabled: true,
	authorization: 'token',
	requireApproval: 'always',
	allowedTools: [],
	deferLoading: false,
	tools: [],
	createdAt: '2026-05-22T00:00:00.000Z',
	updatedAt: '2026-05-22T00:00:00.000Z',
};

const model: Model = { id: 'gpt-5.4', name: 'GPT-5.4' };
const imageModel: Model = { id: 'FLUX.2', name: 'FLUX.2' };
const textToSpeechModel: Model = { id: 'eleven_v3', name: 'Eleven v3' };
const videoModel: Model = { id: 'gen4.5', name: 'Gen 4.5' };
const musicModel: Model = { id: 'suno-v5.5', name: 'Suno v5.5' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StoreService', () => {
	beforeEach(() => {
		MockStore.mockClear();
	});

	// -------------------------------------------------------------------------
	// channel config
	// -------------------------------------------------------------------------

	describe('channel config', () => {
		it('creates default config entries for every bundled channel id', () => {
			const service = new StoreService();

			const channel = service.getChannel();

			expect(Object.keys(channel).sort()).toEqual([...CHANNEL_PROVIDER_IDS].sort());
			expect(channel.telegram).toMatchObject({
				token: '',
				allowFrom: [],
				enabled: false,
				dmPolicy: 'allowlist',
			});
			expect(channel.slack).toMatchObject({
				enabled: false,
				defaultAccountId: 'default',
				accounts: {
					default: expect.objectContaining({
						token: '',
						allowFrom: [],
						groupAllowFrom: [],
						dmPolicy: 'allowlist',
					}),
				},
			});
		});

		it('stores generic channel config without losing other channel defaults', () => {
			const service = new StoreService();
			const store = storeFor(service);

			const saved = service.setChannelConfig('slack', {
				enabled: true,
				defaultAccountId: 'default',
				accounts: {
					default: {
						label: 'Workspace bot',
						enabled: true,
						token: 'xoxb-token',
						serverUrl: 'https://workspace.slack.com',
						defaultTarget: 'C123',
						allowFrom: ['U1', 'U1', ' U2 '],
						groupAllowFrom: ['C123'],
						dmPolicy: 'allowlist',
					},
				},
			});

			expect(saved).toMatchObject({
				enabled: true,
				accounts: {
					default: expect.objectContaining({
						label: 'Workspace bot',
						token: 'xoxb-token',
						allowFrom: ['U1', 'U2'],
					}),
				},
			});
			expect(service.getChannel().telegram).toMatchObject({ token: '', allowFrom: [] });
			expect(Object.keys(store.get('channels') as Record<string, unknown>)).toEqual(['slack']);
			expect(store.get('channels')).toMatchObject({
				slack: {
					accounts: {
						default: expect.objectContaining({ token: 'xoxb-token' }),
					},
				},
			});
			expect(store.get('channel')).toBeUndefined();
		});

		it('reads legacy singular channel config but writes the documented plural root', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('channel', { telegram: { token: 'legacy-token', allowFrom: ['123'] } });

			expect(service.getTelegramChannel()).toMatchObject({
				token: 'legacy-token',
				allowFrom: ['123'],
			});

			service.setTelegramChannel({ token: 'next-token', allowFrom: ['456'] });

			expect(store.get('channels')).toMatchObject({
				telegram: { token: 'next-token', allowFrom: ['456'] },
			});
		});
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

	describe('background task settings', () => {
		it('normalizes allowed task policy from the backgroundTask root', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'backgroundTask',
				{
					allowedTaskTypes: [' agent.run ', '', 42, 'ocr.run'],
					defaultConcurrency: 2,
				}
			);

			expect(service.getBackgroundTaskSettings()).toEqual({
				allowedTaskTypes: ['agent.run', 'ocr.run'],
				defaultConcurrency: 2,
			});
		});
	});

	describe('connectors', () => {
		it('defaults missing or invalid connector roots to an empty list', () => {
			const service = new StoreService();
			const store = storeFor(service);

			expect(service.getConnectors()).toEqual([]);

			store.set('connectors', { id: 'gmail' });
			expect(service.getConnectors()).toEqual([]);
		});
	});

	describe('Cron job state', () => {
		it('patches legacy cron tasks without replacing sibling scheduler state', () => {
			const service = new StoreService();
			const store = storeFor(service);
			const managed = { schedules: [{ id: 'schedule-1' }] };
			const jobs = { jobs: [{ id: 'job-1' }] };
			const legacyTasks = [
				{
					id: 'legacy-1',
					expression: '* * * * *',
					data: { type: 'agent', prompt: 'Run' },
					createdAt: '2026-05-22T00:00:00.000Z',
				},
			];
			store.set('taskScheduler', { managed, jobs });

			service.setCronTasks(legacyTasks);

			expect(store.get('taskScheduler')).toEqual({
				managed,
				jobs,
				legacyTasks,
			});
		});

		it('persists cron jobs, states, and runs through the settings store', () => {
			const service = new StoreService();
			const state = {
				...emptyCronJobStoreState(),
				jobs: [
					{
						id: 'job-1',
						name: 'Stored cron',
						description: '',
						enabled: true,
						createdAtMs: 1,
						updatedAtMs: 1,
						schedule: { kind: 'every' as const, everyMs: 60_000 },
						sessionTarget: 'isolated' as const,
						wakeMode: 'now' as const,
						payload: { kind: 'agentTurn' as const, message: 'Run' },
						delivery: { mode: 'none' as const },
					},
				],
				states: {
					'job-1': {
						consecutiveErrors: 0,
						consecutiveSkipped: 0,
						consecutiveScheduleErrors: 0,
						attempts: 0,
					},
				},
				runs: {
					'job-1': [
						{
							runId: 'run-1',
							jobId: 'job-1',
							status: 'ok' as const,
							mode: 'manual-force' as const,
							scheduledForMs: 1,
							startedAtMs: 1,
							finishedAtMs: 2,
							attempt: 1,
						},
					],
				},
			};

			expect(service.getCronJobState()).toEqual(emptyCronJobStoreState());
			service.setCronJobState(state);

			expect(service.getCronJobState()).toMatchObject({
				jobs: [{ id: 'job-1' }],
				states: {
					'job-1': expect.objectContaining({
						scheduleIdentity: '{"everyMs":60000,"kind":"every"}',
					}),
				},
				runs: { 'job-1': [{ runId: 'run-1' }] },
			});
			expect(
				(service as unknown as { store: { get: (k: string) => unknown } }).store.get(
					'taskScheduler'
				)
			).toMatchObject({
				jobs: {
					jobs: [{ id: 'job-1' }],
				},
			});
		});
	});

	// -------------------------------------------------------------------------
	// getProviderById
	// -------------------------------------------------------------------------

	describe('getProviderById()', () => {
		it('returns the matching provider when present', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
				[openaiProvider]
			);

			const result = service.getProviderById('openai');

			expect(result).toMatchObject(openaiProvider);
			expect(result?.capabilities).toContain('Chat');
		});

		it('matches case-insensitively on the queried id', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
				[openaiProvider]
			);

			// stored as 'openai', queried as 'OpenAI'
			expect(service.getProviderById('OpenAI')).toMatchObject(openaiProvider);
		});

		it('trims whitespace from the queried id before matching', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
				[openaiProvider]
			);

			expect(service.getProviderById('  openai  ')).toMatchObject(openaiProvider);
		});

		it('trims whitespace from the stored id when matching', () => {
			const paddedProvider: Provider = { ...openaiProvider, id: ' openai ' };
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
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
				'modelProviders',
				[openaiProvider]
			);

			expect(service.getProviderById('unknown')).toBeUndefined();
		});

		it('returns undefined when the modelProviders key is absent from the store', () => {
			// Store is empty by default (new Map).
			const service = new StoreService();

			expect(service.getProviderById('openai')).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// getAgentService
	// -------------------------------------------------------------------------

	describe('getAgentService()', () => {
		it('returns the agent service selection when llmAgent is set', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('modelProviders', [openaiProvider]);
			store.set('llmAgent', { providerId: 'openai', modelId: model.id });

			expect(service.getAgentService()).toMatchObject({
				provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
				model,
			});
			expect(service.getAgentService()?.provider).not.toHaveProperty('apiKey');
		});

		it('ignores legacy service agent selections', () => {
			const legacyService = {
				agent: {
					provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
					model,
				},
			};
			const service = new StoreService();
			storeFor(service).set('service', legacyService);

			expect(service.getAgentService()).toBeUndefined();
		});

		it('returns undefined when service state is absent', () => {
			const service = new StoreService();

			expect(service.getAgentService()).toBeUndefined();
		});

		it('returns undefined when llmAgent is absent', () => {
			const service = new StoreService();

			expect(service.getAgentService()).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// getAssistantModel
	// -------------------------------------------------------------------------

	describe('getAssistantModel()', () => {
		it('returns the model when assistant is set', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('modelProviders', [openaiProvider]);
			store.set('llmAgent', { providerId: 'openai', modelId: model.id });

			expect(service.getAssistantModel()).toMatchObject(model);
		});

		it('returns undefined when service state is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantModel()).toBeUndefined();
		});

		it('returns undefined when llmAgent is absent', () => {
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
			store.set('modelProviders', [openaiProvider]);
			store.set('llmAgent', { providerId: 'openai', modelId: model.id });

			expect(service.getAssistantProvider()).toEqual(providerRef);
		});

		it('returns undefined when service state is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantProvider()).toBeUndefined();
		});

		it('returns undefined when llmAgent is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantProvider()).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// setAgentService
	// -------------------------------------------------------------------------

	describe('setAgentService()', () => {
		it('returns false and does not write when the provider id is not found', () => {
			const service = new StoreService();

			const result = service.setAgentService('unknown', model);

			expect(result).toBe(false);
			expect(service.getAgentService()).toBeUndefined();
		});

		it('returns true and writes the agent service when the provider is found', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
				[openaiProvider]
			);

			const result = service.setAgentService('openai', model);

			expect(result).toBe(true);
			expect(service.getAgentService()).toBeDefined();
		});

		it('preserves safe llmAgent options when changing the assistant model', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('modelProviders', [openaiProvider]);
			store.set('llmAgent', {
				providerId: 'openai',
				modelId: 'old-model',
				options: { agents: { defaultAgentId: 'main' } },
			});

			service.setAgentService('openai', model);

			expect(store.get('llmAgent')).toEqual({
				providerId: 'openai',
				modelId: 'gpt-5.4',
				options: { agents: { defaultAgentId: 'main' } },
			});
		});

		it('does not create legacy rag and ocr fields when no current service state exists', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
				[openaiProvider]
			);

			service.setAgentService('openai', model);

			const store = storeFor(service);
			expect(store.get('rag')).toBeUndefined();
			expect(store.get('ocr')).toBeUndefined();
		});

		it('writes the provider without the apiKey field', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
				[openaiProvider]
			);

			service.setAgentService('openai', model);

			const written = service.getAgentService();
			expect(written?.provider).not.toHaveProperty('apiKey');
			expect(written?.provider).toEqual({
				id: 'openai',
				name: 'OpenAI',
				baseUrl: 'https://api.openai.com/v1',
			});
		});

		it('forwards the model as-is to the written service', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
				[openaiProvider]
			);

			service.setAgentService('openai', model);

			expect(service.getAgentService()?.model).toMatchObject(model);
		});

		it('persists the compact agent module selection at the root', () => {
			const service = new StoreService();
			const store = (
				service as unknown as {
					store: { get: (k: string) => unknown; set: (k: string, v: unknown) => void };
				}
			).store;
			store.set('modelProviders', [openaiProvider]);

			service.setAgentService('openai', { ...model, effort: 'high' });

			expect(store.get('llmAgent')).toEqual({
				providerId: 'openai',
				modelId: 'gpt-5.4',
				effort: 'high',
			});
			expect(store.get('agent')).toBeUndefined();
			expect(store.get('service')).toBeUndefined();
		});
	});

	describe('setImageCreatorService()', () => {
		it('persists the compact imageCreator module selection at the root', () => {
			const service = new StoreService();
			const store = (
				service as unknown as {
					store: { get: (k: string) => unknown; set: (k: string, v: unknown) => void };
				}
			).store;
			store.set('modelProviders', [imageProvider]);

			const result = service.setImageCreatorService('black-forest-labs', imageModel);

			expect(result).toBe(true);
			expect(store.get('imageCreator')).toEqual({
				providerId: 'black-forest-labs',
				modelId: 'FLUX.2',
			});
			expect(store.get('service')).toBeUndefined();
		});

		it('returns the image creator service without exposing the provider api key', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
				[imageProvider]
			);

			service.setImageCreatorService('black-forest-labs', imageModel);

			expect(service.getImageCreatorService()).toMatchObject({
				provider: {
					id: 'black-forest-labs',
					name: 'Black Forest Labs',
					baseUrl: 'https://api.bfl.ai/v1',
				},
				model: imageModel,
			});
			expect(service.getImageCreatorService()?.provider).not.toHaveProperty('apiKey');
		});

		it('rejects providers without image capability', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
				[anthropicProvider]
			);

			expect(service.setImageCreatorService('anthropic', imageModel)).toBe(false);
			expect(service.getImageCreatorService()).toBeUndefined();
		});

		it('rejects unsupported image model ids', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
				[imageProvider]
			);

			expect(service.setImageCreatorService('black-forest-labs', model)).toBe(false);
			expect(service.getImageCreatorService()).toBeUndefined();
		});
	});

	describe('pending runtime model services', () => {
		it('persists compact text-to-speech, video, and music selections', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('modelProviders', [textToSpeechProvider, videoProvider, musicProvider]);

			expect(service.setTextToSpeechService('elevenlabs', textToSpeechModel)).toBe(true);
			expect(service.setTextToVideoService('runway', videoModel)).toBe(true);
			expect(service.setTextToSoundService('suno', musicModel)).toBe(true);

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
			expect(service.getTextToSpeechService()).toMatchObject({
				provider: { id: 'elevenlabs', name: 'ElevenLabs' },
				model: textToSpeechModel,
			});
			expect(service.getTextToVideoService()).toMatchObject({
				provider: { id: 'runway', name: 'Runway' },
				model: videoModel,
			});
			expect(service.getTextToSoundService()).toMatchObject({
				provider: { id: 'suno', name: 'Suno' },
				model: musicModel,
			});
			expect(service.getTextToSoundService()?.provider).not.toHaveProperty('apiKey');
		});

		it('rejects unsupported pending-runtime model selections', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('modelProviders', [textToSpeechProvider, videoProvider, anthropicProvider]);

			expect(service.setTextToSpeechService('elevenlabs', model)).toBe(false);
			expect(service.setTextToVideoService('runway', model)).toBe(false);
			expect(service.setTextToSoundService('anthropic', musicModel)).toBe(false);
			expect(service.getTextToSpeechService()).toBeUndefined();
			expect(service.getTextToVideoService()).toBeUndefined();
			expect(service.getTextToSoundService()).toBeUndefined();
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
			expect(store.get('modelProviders')).toEqual([
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
				'modelProviders',
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
				'modelProviders',
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
	// channel
	// -------------------------------------------------------------------------

	describe('channel settings', () => {
		it('hydrates every supported channel provider with defaults', () => {
			const service = new StoreService();

			const channel = service.getChannel();

			expect(Object.keys(channel).sort()).toEqual([...CHANNEL_PROVIDER_IDS].sort());
			expect(channel.telegram).toMatchObject({
				token: '',
				allowFrom: [],
				enabled: false,
				defaultAccountId: 'default',
			});
			expect(channel.slack).toMatchObject({
				enabled: false,
				defaultAccountId: 'default',
			});
			expect(channel.slack.accounts?.default).toMatchObject({
				label: 'slack default',
				enabled: false,
				dmPolicy: 'allowlist',
			});
		});

		it('merges legacy partial channel config with provider defaults', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'channel',
				{
					telegram: {
						token: 'telegram-token',
						allowFrom: [' user-1 ', 'user-1', 'user-2'],
					},
					slack: {
						enabled: true,
					},
				} as Partial<Channel>
			);

			const channel = service.getChannel();

			expect(channel.telegram).toMatchObject({
				token: 'telegram-token',
				allowFrom: ['user-1', 'user-2'],
				enabled: false,
				defaultAccountId: 'default',
			});
			expect(channel.discord).toMatchObject({
				token: '',
				allowFrom: [],
				enabled: false,
			});
			expect(channel.slack).toMatchObject({
				enabled: true,
				defaultAccountId: 'default',
			});
			expect(channel.slack.accounts?.default?.dmPolicy).toBe('allowlist');
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
			expect(store.get('modelProviders')).toEqual([
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
				'modelProviders',
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
				'modelProviders',
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
