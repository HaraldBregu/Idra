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
import { emptyFridayCronStoreState } from '../../../../src/main/cron';
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

	describe('policy settings', () => {
		it('initializes missing policy state with documented default grants', () => {
			const service = new StoreService();
			const store = storeFor(service);
			const expected = {
				version: 1,
				defaultPolicy: 'deny' as const,
				paths: [
					{
						path: '/workspace',
						permissions: ['read', 'write', 'create', 'delete'],
						recursive: true,
					},
					{
						path: '/agent',
						permissions: ['read', 'write', 'create', 'delete'],
						recursive: true,
					},
				],
			};

			expect(service.getPolicy()).toEqual(expected);
			expect(store.get('policy')).toEqual(expected);
		});

		it('normalizes policy grants while preserving valid path order', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('policy', {
				version: 1,
				defaultPolicy: 'allow',
				paths: [
					{
						path: ' /tmp/friday ',
						permissions: ['read', 'unknown', 'write'],
						recursive: true,
					},
					{
						path: '/tmp/friday/private',
						permissions: [],
						recursive: true,
					},
					{
						path: '/tmp/friday/../secrets',
						permissions: ['read'],
						recursive: true,
					},
					{
						path: 'relative/path',
						permissions: ['read'],
						recursive: true,
					},
				],
			});

			expect(service.getPolicy()).toEqual({
				version: 1,
				defaultPolicy: 'allow',
				paths: [
					{ path: '/tmp/friday', permissions: ['read', 'write'], recursive: true },
					{ path: '/tmp/friday/private', permissions: [], recursive: true },
				],
			});
		});

		it('rejects unsupported policy versions without replacing the stored policy', () => {
			const service = new StoreService();
			const store = storeFor(service);
			const current = {
				version: 1,
				defaultPolicy: 'allow' as const,
				paths: [{ path: '/tmp/friday', permissions: ['read' as const], recursive: true }],
			};

			expect(service.setPolicy(current)).toEqual(current);
			expect(() =>
				service.setPolicy({ version: 2, defaultPolicy: 'deny', paths: [] })
			).toThrow('Unsupported policy version.');
			expect(store.get('policy')).toEqual(current);
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

	describe('Friday cron state', () => {
		it('patches legacy cron tasks without replacing sibling scheduler state', () => {
			const service = new StoreService();
			const store = storeFor(service);
			const managed = { schedules: [{ id: 'schedule-1' }] };
			const friday = { schemaVersion: 1, jobs: {} };
			const legacyTasks = [
				{
					id: 'legacy-1',
					expression: '* * * * *',
					data: { type: 'agent', prompt: 'Run' },
					createdAt: '2026-05-22T00:00:00.000Z',
				},
			];
			store.set('taskScheduler', { managed, ...friday });

			service.setCronTasks(legacyTasks);

			expect(store.get('taskScheduler')).toEqual({
				managed,
				...friday,
				legacyTasks,
			});
		});

		it('persists Friday cron jobs, states, and the last run through the settings store', () => {
			const service = new StoreService();
			const state = {
				...emptyFridayCronStoreState(),
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
				lastRuns: {
					'job-1': {
						runId: 'run-1',
						jobId: 'job-1',
						status: 'ok' as const,
						mode: 'manual-force' as const,
						scheduledForMs: 1,
						startedAtMs: 1,
						finishedAtMs: 2,
						attempt: 1,
					},
				},
			};

			expect(service.getFridayCronState()).toEqual(emptyFridayCronStoreState());
			service.setFridayCronState(state);

			expect(service.getFridayCronState()).toMatchObject({
				jobs: [{ id: 'job-1' }],
				states: {
					'job-1': expect.objectContaining({
						scheduleIdentity: '{"everyMs":60000,"kind":"every"}',
					}),
				},
				lastRuns: { 'job-1': { runId: 'run-1' } },
			});
			const taskScheduler = (
				service as unknown as { store: { get: (k: string) => unknown } }
			).store.get('taskScheduler') as {
				friday?: unknown;
				runs?: unknown;
				states?: unknown;
				lastRuns?: unknown;
				jobs?: Record<string, { lastRun?: unknown; state?: unknown }>;
			};
			expect(taskScheduler).toMatchObject({
				jobs: {
					'job-1': {
						name: 'Stored cron',
						lastRun: { runId: 'run-1' },
						state: expect.objectContaining({
							scheduleIdentity: '{"everyMs":60000,"kind":"every"}',
						}),
					},
				},
			});
			expect(taskScheduler.friday).toBeUndefined();
			expect(taskScheduler.states).toBeUndefined();
			expect(taskScheduler.lastRuns).toBeUndefined();
			expect(taskScheduler.runs).toBeUndefined();
		});

		it('normalizes legacy Friday cron run arrays to only the last run', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('taskScheduler', {
				friday: {
					jobs: [
						{
							id: 'job-1',
							name: 'Stored cron',
							description: '',
							enabled: true,
							createdAtMs: 1,
							updatedAtMs: 1,
							schedule: { kind: 'every', everyMs: 60_000 },
							sessionTarget: 'isolated',
							wakeMode: 'now',
							payload: { kind: 'agentTurn', message: 'Run' },
							delivery: { mode: 'none' },
						},
					],
					states: {},
					runs: {
						'job-1': [
							{
								runId: 'run-1',
								jobId: 'job-1',
								status: 'ok',
								mode: 'manual-force',
								scheduledForMs: 1,
								startedAtMs: 1,
								finishedAtMs: 2,
								attempt: 1,
							},
							{
								runId: 'run-2',
								jobId: 'job-1',
								status: 'error',
								mode: 'automatic',
								scheduledForMs: 3,
								startedAtMs: 3,
								finishedAtMs: 4,
								attempt: 1,
							},
						],
					},
				},
			});

			service.setFridayCronState(service.getFridayCronState());

			const taskScheduler = store.get('taskScheduler') as {
				friday?: unknown;
				runs?: unknown;
				lastRuns?: unknown;
				jobs?: Record<string, { lastRun?: { runId?: string } }>;
			};
			expect(taskScheduler.jobs?.['job-1']?.lastRun?.runId).toBe('run-2');
			expect(taskScheduler.friday).toBeUndefined();
			expect(taskScheduler.lastRuns).toBeUndefined();
			expect(taskScheduler.runs).toBeUndefined();
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

		it('preserves stored provider metadata and enabled state', () => {
			const service = new StoreService();
			const provider = {
				...openaiProvider,
				capabilities: ' Chat - Image ',
				apiConfiguration: {
					credentialType: 'API key',
					apiKeyManagementUrl: 'https://example.test/keys',
					configurationDocsUrl: 'https://example.test/docs',
					authMethod: 'Bearer',
					recommendedEnvVars: ['EXAMPLE_API_KEY'],
					baseUrls: ['https://api.example.test'],
					importantNotes: ['Keep private'],
				},
				enabled: true,
			};
			storeFor(service).set('modelProviders', [provider]);

			const result = service.getProviderById('openai') as Provider & { enabled?: boolean };

			expect(result).toMatchObject({
				capabilities: 'Chat - Image',
				apiConfiguration: expect.objectContaining({ credentialType: 'API key' }),
				enabled: true,
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
	// getOperator
	// -------------------------------------------------------------------------

	describe('getOperator()', () => {
		it('builds operator state from documented module roots', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('modelProviders', [openaiProvider]);
			store.set('llmAgent', { providerId: 'openai', modelId: model.id });
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
			store.set('modelProviders', [
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
	});

	// -------------------------------------------------------------------------
	// getAssistantOperator
	// -------------------------------------------------------------------------

	describe('getAssistantOperator()', () => {
		it('returns the assistant block when llmAgent is set', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('modelProviders', [openaiProvider]);
			store.set('llmAgent', { providerId: 'openai', modelId: model.id });

			expect(service.getAssistantOperator()).toMatchObject({
				id: 'friday',
				name: 'Assistant',
				docsPath: 'models/large-language-model.md',
				status: 'implemented',
				provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
				model,
			});
		});

		it('ignores legacy service agent selections', () => {
			const legacyOperator = {
				agent: {
					provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
					model,
				},
			};
			const service = new StoreService();
			storeFor(service).set('service', legacyOperator);

			expect(service.getAssistantOperator()).toBeUndefined();
		});

		it('returns undefined when operator state is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantOperator()).toBeUndefined();
		});

		it('returns undefined when llmAgent is absent', () => {
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
			store.set('modelProviders', [openaiProvider]);
			store.set('llmAgent', { providerId: 'openai', modelId: model.id });

			expect(service.getAssistantModel()).toEqual(model);
		});

		it('returns undefined when operator state is absent', () => {
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

		it('returns undefined when llmAgent is absent', () => {
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
				'modelProviders',
				[openaiProvider]
			);

			const result = service.setAssistantOperator('openai', model);

			expect(result).toBe(true);
			expect(service.getOperator()?.assistant).toBeDefined();
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

			service.setAssistantOperator('openai', model);

			expect(store.get('llmAgent')).toEqual({
				providerId: 'openai',
				modelId: 'gpt-5.4',
				options: { agents: { defaultAgentId: 'main' } },
			});
		});

		it('does not create legacy rag and ocr fields when no current operator state exists', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
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
				'modelProviders',
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
				'modelProviders',
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
			store.set('modelProviders', [openaiProvider]);

			service.setAssistantOperator('openai', { ...model, effort: 'high' });

			expect(store.get('llmAgent')).toEqual({
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
			store.set('modelProviders', [imageProvider]);

			const result = service.setImageCreatorOperator('black-forest-labs', imageModel);

			expect(result).toBe(true);
			expect(store.get('imageCreator')).toEqual({
				providerId: 'black-forest-labs',
				modelId: 'FLUX.2',
			});
			expect(store.get('service')).toBeUndefined();
		});

		it('returns the image creator operator without exposing the provider api key', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
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
				'modelProviders',
				[anthropicProvider]
			);

			expect(service.setImageCreatorOperator('anthropic', imageModel)).toBe(false);
			expect(service.getImageCreatorOperator()).toBeUndefined();
		});

		it('rejects unsupported image model ids', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
				[imageProvider]
			);

			expect(service.setImageCreatorOperator('black-forest-labs', model)).toBe(false);
			expect(service.getImageCreatorOperator()).toBeUndefined();
		});
	});

	describe('pending runtime model operators', () => {
		it('persists compact text-to-speech, video, and music selections', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('modelProviders', [textToSpeechProvider, videoProvider, musicProvider]);

			expect(service.setTextToSpeechOperator('elevenlabs', textToSpeechModel)).toBe(true);
			expect(service.setTextToVideoOperator('runway', videoModel)).toBe(true);
			expect(service.setMusicCreatorOperator('suno', musicModel)).toBe(true);

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
			expect(service.getMusicCreatorOperator()).toMatchObject({
				id: 'music-creator',
				provider: { id: 'suno', name: 'Suno' },
				model: musicModel,
			});
			expect(service.getMusicCreatorOperator()?.provider).not.toHaveProperty('apiKey');
		});

		it('rejects unsupported pending-runtime model selections', () => {
			const service = new StoreService();
			const store = storeFor(service);
			store.set('modelProviders', [textToSpeechProvider, videoProvider, anthropicProvider]);

			expect(service.setTextToSpeechOperator('elevenlabs', model)).toBe(false);
			expect(service.setTextToVideoOperator('runway', model)).toBe(false);
			expect(service.setMusicCreatorOperator('anthropic', musicModel)).toBe(false);
			expect(service.getTextToSpeechOperator()).toBeUndefined();
			expect(service.getTextToVideoOperator()).toBeUndefined();
			expect(service.getMusicCreatorOperator()).toBeUndefined();
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
				expect.objectContaining({
					id: 'openai',
					name: 'OpenAI',
					apiKey: 'sk-new',
					baseUrl: 'https://api.openai.com/v1',
					capabilities: expect.stringContaining('Chat'),
					apiConfiguration: expect.objectContaining({ credentialType: 'API key' }),
				}),
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
				expect.objectContaining({
					id: 'anthropic',
					name: 'Anthropic',
					apiKey: 'ant-new',
					baseUrl: 'https://api.anthropic.com/v1',
					capabilities: 'Chat',
					apiConfiguration: expect.objectContaining({ credentialType: 'API key' }),
				}),
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
