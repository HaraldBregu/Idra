/**
 * Unit tests for StoreService (src/main/store/service.ts).
 *
 * electron-store is mocked with an in-memory Map so that the real
 * StoreService logic (case-insensitive lookups, provider upserts,
 * service writes) is exercised without touching the filesystem.
 */

// jest.mock is hoisted before any import declarations, so the factory
// must be entirely self-contained (no references to outer variables).
jest.mock('electron-store', () => {
	return jest.fn().mockImplementation(() => {
		const data = new Map<string, unknown>();
		return {
			get: (key: string) => data.get(key),
			set: (key: string, value: unknown) => { data.set(key, value); },
			delete: (key: string) => { data.delete(key); },
		};
	});
});

import Store from 'electron-store';
import { StoreService } from '../../../../src/main/store';
import type { Provider } from '../../../../src/shared/providers';
import type { Model, Service } from '../../../../src/shared/service';

// ---------------------------------------------------------------------------
// Typed accessor for the mocked Store constructor.
// ---------------------------------------------------------------------------

const MockStore = Store as jest.MockedClass<typeof Store>;

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

const model: Model = { id: 'gpt-4o', name: 'GPT-4o' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StoreService', () => {
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

	// -------------------------------------------------------------------------
	// getProviderById
	// -------------------------------------------------------------------------

	describe('getProviderById()', () => {
		it('returns the matching provider when present', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('providers', [openaiProvider]);

			const result = service.getProviderById('openai');

			expect(result).toEqual(openaiProvider);
		});

		it('matches case-insensitively on the queried id', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('providers', [openaiProvider]);

			// stored as 'openai', queried as 'OpenAI'
			expect(service.getProviderById('OpenAI')).toEqual(openaiProvider);
		});

		it('trims whitespace from the queried id before matching', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('providers', [openaiProvider]);

			expect(service.getProviderById('  openai  ')).toEqual(openaiProvider);
		});

		it('trims whitespace from the stored id when matching', () => {
			const paddedProvider: Provider = { ...openaiProvider, id: ' openai ' };
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('providers', [paddedProvider]);

			expect(service.getProviderById('openai')).toEqual(paddedProvider);
		});

		it('returns undefined when no provider matches the given id', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('providers', [openaiProvider]);

			expect(service.getProviderById('unknown')).toBeUndefined();
		});

		it('returns undefined when the providers key is absent from the store', () => {
			// Store is empty by default (new Map).
			const service = new StoreService();

			expect(service.getProviderById('openai')).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// getService
	// -------------------------------------------------------------------------

	describe('getService()', () => {
		it('returns the stored service when present', () => {
			const svc: Service = {
				assistant: { provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' }, model },
				rag: 'rag-url',
				ocr: 'ocr-url',
			};
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('service', svc);

			expect(service.getService()).toEqual(svc);
		});

		it('returns undefined when service is absent', () => {
			const service = new StoreService();

			expect(service.getService()).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// getAssistantService
	// -------------------------------------------------------------------------

	describe('getAssistantService()', () => {
		it('returns the assistant block when service is set', () => {
			const svc: Service = {
				assistant: { provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' }, model },
				rag: '',
				ocr: '',
			};
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('service', svc);

			expect(service.getAssistantService()).toEqual(svc.assistant);
		});

		it('returns undefined when service is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantService()).toBeUndefined();
		});

		it('returns undefined when service has no assistant field', () => {
			// Store a partial service (as unknown cast so TS does not complain).
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('service', { rag: '', ocr: '' } as unknown as Service);

			expect(service.getAssistantService()).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// getAssistantModel
	// -------------------------------------------------------------------------

	describe('getAssistantModel()', () => {
		it('returns the model when service and assistant are set', () => {
			const svc: Service = {
				assistant: { provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' }, model },
				rag: '',
				ocr: '',
			};
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('service', svc);

			expect(service.getAssistantModel()).toEqual(model);
		});

		it('returns undefined when service is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantModel()).toBeUndefined();
		});

		it('returns undefined when assistant is absent from the service', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('service', { rag: '', ocr: '' } as unknown as Service);

			expect(service.getAssistantModel()).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// getAssistantProvider
	// -------------------------------------------------------------------------

	describe('getAssistantProvider()', () => {
		it('returns the provider block when service and assistant are set', () => {
			const providerRef = { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' };
			const svc: Service = {
				assistant: { provider: providerRef, model },
				rag: '',
				ocr: '',
			};
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('service', svc);

			expect(service.getAssistantProvider()).toEqual(providerRef);
		});

		it('returns undefined when service is absent', () => {
			const service = new StoreService();

			expect(service.getAssistantProvider()).toBeUndefined();
		});

		it('returns undefined when assistant is absent from the service', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('service', { rag: '', ocr: '' } as unknown as Service);

			expect(service.getAssistantProvider()).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// setAssistantService
	// -------------------------------------------------------------------------

	describe('setAssistantService()', () => {
		it('returns false and does not write when the provider id is not found', () => {
			const service = new StoreService();

			const result = service.setAssistantService('unknown', model);

			expect(result).toBe(false);
			expect(service.getService()).toBeUndefined();
		});

		it('returns true and writes the service when the provider is found', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('providers', [openaiProvider]);

			const result = service.setAssistantService('openai', model);

			expect(result).toBe(true);
			expect(service.getService()).toBeDefined();
		});

		it('preserves existing rag and ocr values from the current service', () => {
			const existing: Service = {
				assistant: { provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' }, model },
				rag: 'existing-rag',
				ocr: 'existing-ocr',
			};
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('providers', [openaiProvider]);
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('service', existing);

			service.setAssistantService('openai', model);

			const written = service.getService();
			expect(written?.rag).toBe('existing-rag');
			expect(written?.ocr).toBe('existing-ocr');
		});

		it('defaults rag and ocr to empty strings when no current service exists', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('providers', [openaiProvider]);

			service.setAssistantService('openai', model);

			const written = service.getService();
			expect(written?.rag).toBe('');
			expect(written?.ocr).toBe('');
		});

		it('writes the provider without the apiKey field', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('providers', [openaiProvider]);

			service.setAssistantService('openai', model);

			const written = service.getService();
			expect(written?.assistant?.provider).not.toHaveProperty('apiKey');
			expect(written?.assistant?.provider).toEqual({
				id: 'openai',
				name: 'OpenAI',
				baseUrl: 'https://api.openai.com/v1',
			});
		});

		it('forwards the model as-is to the written service', () => {
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('providers', [openaiProvider]);

			service.setAssistantService('openai', model);

			expect(service.getService()?.assistant?.model).toEqual(model);
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
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('providers', [openaiProvider, anthropicProvider]);

			service.setOpenAiApiKey('sk-updated');

			const providers = service.getProviderById('openai');
			expect(providers?.apiKey).toBe('sk-updated');
			// anthropic must still be present
			expect(service.getProviderById('anthropic')).toEqual(anthropicProvider);
		});

		it('replaces by case-insensitive id match (stored id "OpenAI")', () => {
			const mixedCase: Provider = { ...openaiProvider, id: 'OpenAI' };
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('providers', [mixedCase]);

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
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('providers', [openaiProvider, anthropicProvider]);

			service.setAnthropicApiKey('ant-updated');

			expect(service.getProviderById('anthropic')?.apiKey).toBe('ant-updated');
			// openai must still be present
			expect(service.getProviderById('openai')).toEqual(openaiProvider);
		});

		it('replaces by case-insensitive id match (stored id "Anthropic")', () => {
			const mixedCase: Provider = { ...anthropicProvider, id: 'Anthropic' };
			const service = new StoreService();
			(service as unknown as { store: { set: (k: string, v: unknown) => void } })
				.store.set('providers', [mixedCase]);

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
