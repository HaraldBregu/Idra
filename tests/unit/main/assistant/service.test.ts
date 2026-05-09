/**
 * Unit tests for AssistantService (src/main/assistant/service.ts).
 *
 * Assistant is mocked at the module boundary so that MemoryManager,
 * SessionManager, OpenAI, filesystem I/O, and Electron APIs are never
 * exercised. The tests validate the service's own logic: registry
 * management, routing to the correct assistant, lazy creation, and
 * error propagation.
 */

import { AssistantService } from '../../../../src/main/assistant/service';
import { DEFAULT_ASSISTANT_ID } from '../../../../src/main/assistant/constants';
import { AssistantRegistry } from '../../../../src/main/assistant/registry';
import type { StoreService } from '../../../../src/main/store';
import type { CronService } from '../../../../src/main/cron';

// ---------------------------------------------------------------------------
// Mock the Assistant class so no real I/O / OpenAI calls are made.
// ---------------------------------------------------------------------------

const mockSend = jest.fn<Promise<string>, [string]>();
const mockReset = jest.fn<Promise<void>, []>();

// We capture constructor calls so we can assert which ids were registered.
const MockAssistant = jest.fn().mockImplementation((id: string) => ({
	id,
	send: mockSend,
	reset: mockReset,
}));

jest.mock('../../../../src/main/assistant/assistant', () => ({
	Assistant: MockAssistant,
}));

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

type MockAssistantInstance = {
	id: string;
	send: jest.MockedFunction<(msg: string) => Promise<string>>;
	reset: jest.MockedFunction<() => Promise<void>>;
};

function lastInstance(): MockAssistantInstance {
	const calls = MockAssistant.mock.results;
	return calls[calls.length - 1].value as MockAssistantInstance;
}

// ---------------------------------------------------------------------------
// Shared stubs — the service passes these through to Assistant; because
// Assistant is fully mocked, the stubs are never actually invoked.
// ---------------------------------------------------------------------------

const stubStore = {} as unknown as StoreService;
const stubCron = {} as unknown as CronService;
const deps = { store: stubStore, cron: stubCron };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AssistantService', () => {
	// clearMocks: true in jest.config.cjs resets call counts between tests,
	// but we also clear explicitly for explicitness.
	beforeEach(() => {
		MockAssistant.mockClear();
		mockSend.mockClear();
		mockReset.mockClear();
	});

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	describe('constructor', () => {
		it('eagerly registers the default assistant on construction', () => {
			new AssistantService(deps);

			expect(MockAssistant).toHaveBeenCalledTimes(1);
			expect(MockAssistant).toHaveBeenCalledWith(
				DEFAULT_ASSISTANT_ID,
				stubStore,
				stubCron
			);
		});

		it('uses DEFAULT_ASSISTANT_ID when no defaultAssistantId option is provided', () => {
			const service = new AssistantService(deps);

			// Calling get() with no arg should return the assistant registered
			// under DEFAULT_ASSISTANT_ID without constructing a second instance.
			const assistant = service.get();
			expect(assistant.id).toBe(DEFAULT_ASSISTANT_ID);
			expect(MockAssistant).toHaveBeenCalledTimes(1);
		});

		it('registers a custom defaultAssistantId when provided via options', () => {
			new AssistantService(deps, { defaultAssistantId: 'custom' });

			expect(MockAssistant).toHaveBeenCalledTimes(1);
			expect(MockAssistant).toHaveBeenCalledWith('custom', stubStore, stubCron);
		});

		it('uses a provided registry instead of creating a new one', () => {
			const registry = new AssistantRegistry();
			const service = new AssistantService(deps, { registry });

			// Sanity: the service's ensure() registered the default id into our
			// supplied registry, so get() must return the correct assistant.
			const assistant = service.get();
			expect(assistant.id).toBe(DEFAULT_ASSISTANT_ID);
			expect(registry.has(DEFAULT_ASSISTANT_ID)).toBe(true);
		});

		it('forwards store and cron dependencies to the Assistant constructor', () => {
			new AssistantService(deps);

			const [, receivedStore, receivedCron] = MockAssistant.mock.calls[0];
			expect(receivedStore).toBe(stubStore);
			expect(receivedCron).toBe(stubCron);
		});
	});

	// -------------------------------------------------------------------------
	// send()
	// -------------------------------------------------------------------------

	describe('send()', () => {
		it('routes to the default assistant when no assistantId is given', async () => {
			mockSend.mockResolvedValueOnce('hello from main');
			const service = new AssistantService(deps);

			const result = await service.send('ping');

			expect(mockSend).toHaveBeenCalledTimes(1);
			expect(mockSend).toHaveBeenCalledWith('ping');
			expect(result).toBe('hello from main');
		});

		it('routes to a named assistant when assistantId is provided', async () => {
			mockSend.mockResolvedValueOnce('hello from other');
			const service = new AssistantService(deps);

			const result = await service.send('ping', 'other-id');

			expect(result).toBe('hello from other');
			// The named assistant's send should have received the message.
			expect(mockSend).toHaveBeenCalledWith('ping');
		});

		it('lazily creates a new assistant for an unknown assistantId', async () => {
			mockSend.mockResolvedValue('ok');
			const service = new AssistantService(deps);
			MockAssistant.mockClear(); // ignore the eager constructor call

			await service.send('msg', 'brand-new');

			expect(MockAssistant).toHaveBeenCalledTimes(1);
			expect(MockAssistant).toHaveBeenCalledWith('brand-new', stubStore, stubCron);
		});

		it('reuses the same assistant instance on repeated calls with the same id', async () => {
			mockSend.mockResolvedValue('ok');
			const service = new AssistantService(deps);
			MockAssistant.mockClear();

			await service.send('first', 'repeat-id');
			await service.send('second', 'repeat-id');

			// Only one new constructor call despite two send() calls.
			expect(MockAssistant).toHaveBeenCalledTimes(1);
		});

		it('propagates a rejection from the underlying assistant send()', async () => {
			const error = new Error('OpenAI unavailable');
			mockSend.mockRejectedValueOnce(error);
			const service = new AssistantService(deps);

			await expect(service.send('ping')).rejects.toThrow('OpenAI unavailable');
		});
	});

	// -------------------------------------------------------------------------
	// reset()
	// -------------------------------------------------------------------------

	describe('reset()', () => {
		it('routes to the default assistant when no assistantId is given', async () => {
			mockReset.mockResolvedValueOnce(undefined);
			const service = new AssistantService(deps);

			await service.reset();

			expect(mockReset).toHaveBeenCalledTimes(1);
		});

		it('routes to a named assistant when assistantId is provided', async () => {
			mockReset.mockResolvedValue(undefined);
			mockSend.mockResolvedValue('ok');
			const service = new AssistantService(deps);

			// Ensure 'named' exists first via send, then reset it.
			await service.send('prime', 'named');
			await service.reset('named');

			expect(mockReset).toHaveBeenCalledTimes(1);
		});

		it('lazily creates a new assistant when reset() is called for an unknown id', async () => {
			mockReset.mockResolvedValueOnce(undefined);
			const service = new AssistantService(deps);
			MockAssistant.mockClear();

			await service.reset('fresh-id');

			expect(MockAssistant).toHaveBeenCalledTimes(1);
			expect(MockAssistant).toHaveBeenCalledWith('fresh-id', stubStore, stubCron);
		});
	});

	// -------------------------------------------------------------------------
	// get()
	// -------------------------------------------------------------------------

	describe('get()', () => {
		it('returns the default assistant when called with no argument', () => {
			const service = new AssistantService(deps);

			const assistant = service.get();

			expect(assistant.id).toBe(DEFAULT_ASSISTANT_ID);
		});

		it('returns an existing assistant by id without constructing a new one', () => {
			const service = new AssistantService(deps);
			MockAssistant.mockClear();

			// First get() for 'other' → lazily creates.
			service.get('other');
			// Second get() for 'other' → must reuse.
			service.get('other');

			expect(MockAssistant).toHaveBeenCalledTimes(1);
		});

		it('lazily creates an assistant for a new id on first get()', () => {
			const service = new AssistantService(deps);
			MockAssistant.mockClear();

			const assistant = service.get('new-id');

			expect(MockAssistant).toHaveBeenCalledTimes(1);
			expect(assistant.id).toBe('new-id');
		});

		it('returns the same instance across get() and send() calls for the same id', async () => {
			mockSend.mockResolvedValue('ok');
			const service = new AssistantService(deps);
			MockAssistant.mockClear();

			const via_get = service.get('shared');
			await service.send('msg', 'shared');

			// Only one construction — same instance used by both paths.
			expect(MockAssistant).toHaveBeenCalledTimes(1);
			expect(lastInstance().id).toBe(via_get.id);
		});
	});
});
