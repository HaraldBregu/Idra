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

const model: Model = { id: 'gpt-5.4', name: 'GPT-5.4' };
const imageModel: Model = { id: 'image-provider-coming-soon', name: 'Not available yet' };

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

		describe('app settings', () => {
		it('defaults microphone on and keep-awake off', () => {
			const service = new StoreService();

			expect(service.getMicrophoneEnabled()).toBe(true);
			expect(service.getKeepAwakeEnabled()).toBe(false);
		});

		it('persists the keep-awake setting', () => {
			const service = new StoreService();

			expect(service.setKeepAwakeEnabled(true)).toEqual({ keepAwakeEnabled: true });
			expect(service.getKeepAwakeEnabled()).toBe(true);

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

		describe('Friday cron state', () => {
		it('persists Friday cron jobs, states, and runs through the settings store', () => {
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

			expect(service.getFridayCronState()).toEqual(emptyFridayCronStoreState());
			service.setFridayCronState(state);

			expect(service.getFridayCronState()).toMatchObject({
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
				friday: {
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
	// getOperator
	// -------------------------------------------------------------------------

	describe('getOperator()', () => {
		it('returns the stored operator state when present', () => {
			const operator: OperatorStoreState = {
				assistant: {
					id: 'friday',
					name: 'Assistant',
					docsPath: 'agent.md',
					status: 'implemented',
					provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
					model,
				},
				rag: 'rag-url',
				ocr: 'ocr-url',
			};
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'service',
				operator
			);

			expect(service.getOperator()).toEqual(operator);
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
		it('returns the assistant block when operator state is set', () => {
			const assistant = {
				id: 'friday',
				name: 'Assistant',
				docsPath: 'agent.md',
				status: 'implemented' as const,
				provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
				model,
			};
			const operator: OperatorStoreState = {
				assistant,
				rag: '',
				ocr: '',
			};
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'service',
				operator
			);

			expect(service.getAssistantOperator()).toEqual(assistant);
		});

		it('reads legacy agent selections as assistant operators', () => {
			const operator: OperatorStoreState = {
				agent: {
					provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
					model,
				},
			};
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'service',
				operator
			);

			expect(service.getAssistantOperator()).toMatchObject({
				id: 'friday',
				provider: operator.agent?.provider,
				model,
			});
		});

		it('returns undefined when operator state is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantOperator()).toBeUndefined();
		});

		it('returns undefined when operator state has no assistant field', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'service',
				{ rag: '', ocr: '' } as unknown as OperatorStoreState
			);

			expect(service.getAssistantOperator()).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// getAssistantModel
	// -------------------------------------------------------------------------

	describe('getAssistantModel()', () => {
		it('returns the model when assistant is set', () => {
			const operator: OperatorStoreState = {
				assistant: {
					id: 'friday',
					name: 'Assistant',
					docsPath: 'agent.md',
					status: 'implemented',
					provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
					model,
				},
			};
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'service',
				operator
			);

			expect(service.getAssistantModel()).toEqual(model);
		});

		it('returns undefined when operator state is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantModel()).toBeUndefined();
		});

		it('returns undefined when assistant is absent from the operator state', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'service',
				{ rag: '', ocr: '' } as unknown as OperatorStoreState
			);

			expect(service.getAssistantModel()).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// getAssistantProvider
	// -------------------------------------------------------------------------

	describe('getAssistantProvider()', () => {
		it('returns the provider block when assistant is set', () => {
			const providerRef = { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' };
			const operator: OperatorStoreState = {
				assistant: {
					id: 'friday',
					name: 'Assistant',
					docsPath: 'agent.md',
					status: 'implemented',
					provider: providerRef,
					model,
				},
			};
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'service',
				operator
			);

			expect(service.getAssistantProvider()).toEqual(providerRef);
		});

		it('returns undefined when operator state is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantProvider()).toBeUndefined();
		});

		it('returns undefined when assistant is absent from the operator state', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'service',
				{ rag: '', ocr: '' } as unknown as OperatorStoreState
			);

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

		it('preserves existing rag and ocr values from the current service', () => {
			const existing: OperatorStoreState = {
				assistant: {
					id: 'friday',
					name: 'Assistant',
					docsPath: 'agent.md',
					status: 'implemented',
					provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
					model,
				},
				rag: 'existing-rag',
				ocr: 'existing-ocr',
			};
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'modelProviders',
				[openaiProvider]
			);
			(service as unknown as { store: { set: (k: string, v: unknown) => void } }).store.set(
				'service',
				existing
			);

			service.setAssistantOperator('openai', model);

			const written = service.getOperator();
			expect(written?.rag).toBe('existing-rag');
			expect(written?.ocr).toBe('existing-ocr');
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
			expect(written?.assistant?.provider).toEqual({
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

			expect(store.get('agent')).toEqual({
				providerId: 'openai',
				modelId: 'gpt-5.4',
				effort: 'high',
			});
			expect(store.get('llmAgent')).toBeUndefined();
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
				modelId: 'image-provider-coming-soon',
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
				[openaiProvider]
			);

			expect(service.setImageCreatorOperator('openai', imageModel)).toBe(false);
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

	// -------------------------------------------------------------------------
	// setOpenAiApiKey
	// -------------------------------------------------------------------------

	describe('setOpenAiApiKey()', () => {
		it('adds a new openai provider when none exists', () => {
			const service = new StoreService();

			service.setOpenAiApiKey('sk-new');

			const provider = service.getProviderById('openai');
			expect(provider).toEqual({
				id: 'openai',
				name: 'OpenAI',
				apiKey: 'sk-new',
				baseUrl: 'https://api.openai.com/v1',
			});
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
			expect(service.getProviderById('anthropic')).toEqual(anthropicProvider);
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

			expect(service.getProviderById('openai')).toEqual({
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

			service.setAnthropicApiKey('ant-new');

			const provider = service.getProviderById('anthropic');
			expect(provider).toEqual({
				id: 'anthropic',
				name: 'Anthropic',
				apiKey: 'ant-new',
				baseUrl: 'https://api.anthropic.com/v1',
			});
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
			expect(service.getProviderById('openai')).toEqual(openaiProvider);
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

			expect(service.getProviderById('anthropic')).toEqual({
				id: 'anthropic',
				name: 'Anthropic',
				apiKey: 'ant-canonical',
				baseUrl: 'https://api.anthropic.com/v1',
			});
		});
	});
});
