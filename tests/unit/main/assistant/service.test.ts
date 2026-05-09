/**
 * Unit tests for AssistantService (src/main/assistant/service.ts).
 *
 * Assistant is mocked at the module boundary so that MemoryManager,
 * SessionManager, OpenAI, filesystem I/O, and Electron APIs are never
 * exercised. The tests validate the service's own logic: registry
 * management, routing to the correct assistant, lazy creation, and
 * error propagation.
 */

// jest.mock is hoisted by Babel/ts-jest before any variable declarations,
// so the factory must be self-contained (no references to outer `const`s).
jest.mock('../../../../src/main/assistant/assistant', () => {
	const mockSend = jest.fn<Promise<string>, [string]>();
	const mockReset = jest.fn<Promise<void>, []>();
	const MockAssistant = jest.fn().mockImplementation((id: string) => ({
		id,
		send: mockSend,
		reset: mockReset,
	}));
	// Attach the per-instance mocks as static properties so tests can reach
	// them after importing the mocked module.
	MockAssistant._mockSend = mockSend;
	MockAssistant._mockReset = mockReset;
	return { Assistant: MockAssistant };
});

import { AssistantService } from '../../../../src/main/assistant/service';
import { DEFAULT_ASSISTANT_ID } from '../../../../src/main/assistant/constants';
import { AssistantRegistry } from '../../../../src/main/assistant/registry';
import { Assistant } from '../../../../src/main/assistant/assistant';
import type { StoreService } from '../../../../src/main/store';
import type { CronService } from '../../../../src/main/cron';
import type { LoggerService } from '../../../../src/main/logger';

// ---------------------------------------------------------------------------
// Typed accessors for the mock internals defined in the factory above.
// ---------------------------------------------------------------------------

type MockAssistantCtor = jest.MockedClass<typeof Assistant> & {
	_mockSend: jest.MockedFunction<(msg: string) => Promise<string>>;
	_mockReset: jest.MockedFunction<() => Promise<void>>;
};

const MockAssistant = Assistant as unknown as MockAssistantCtor;
const mockSend = MockAssistant._mockSend;
const mockReset = MockAssistant._mockReset;

// ---------------------------------------------------------------------------
// Shared stubs — passed through to Assistant's constructor; never invoked
// because Assistant is fully mocked.
// ---------------------------------------------------------------------------

const stubStore = {} as unknown as StoreService;
const stubCron = {} as unknown as CronService;
const stubLogger = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
} as unknown as LoggerService;
const deps = { store: stubStore, cron: stubCron, logger: stubLogger };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AssistantService', () => {
	beforeEach(() => {
		// clearMocks: true in jest.config.cjs resets mocks between tests, but
		// we also clear the static accessors explicitly for safety.
		MockAssistant.mockClear();
		mockSend.mockReset();
		mockReset.mockReset();
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

			// get() with no arg should return the assistant registered under
			// DEFAULT_ASSISTANT_ID without constructing a second instance.
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

			// The service's ensure() must register the default assistant into our
			// supplied registry instance.
			expect(registry.has(DEFAULT_ASSISTANT_ID)).toBe(true);
			expect(service.get().id).toBe(DEFAULT_ASSISTANT_ID);
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

		it('routes to a named assistant and returns its response', async () => {
			// mockSend is shared across all Assistant instances (mock factory creates
			// one shared function). A single queued value covers the one send() call
			// made on 'other-id' — the constructor does NOT call send().
			mockSend.mockResolvedValueOnce('hello from other');
			const service = new AssistantService(deps);

			const result = await service.send('ping', 'other-id');

			expect(result).toBe('hello from other');
			expect(mockSend).toHaveBeenCalledWith('ping');
		});

		it('lazily creates a new assistant for an unknown assistantId', async () => {
			mockSend.mockResolvedValue('ok');
			const service = new AssistantService(deps);
			MockAssistant.mockClear(); // discard the eager ctor call

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

			// Only one construction despite two send() calls.
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
			mockSend.mockResolvedValue('ok');
			mockReset.mockResolvedValue(undefined);
			const service = new AssistantService(deps);

			// Prime 'named' via send so it exists, then reset it.
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

		it('lazily creates an assistant for a new id on first get()', () => {
			const service = new AssistantService(deps);
			MockAssistant.mockClear();

			const assistant = service.get('new-id');

			expect(MockAssistant).toHaveBeenCalledTimes(1);
			expect(assistant.id).toBe('new-id');
		});

		it('does not construct a new instance on repeated get() for the same id', () => {
			const service = new AssistantService(deps);
			MockAssistant.mockClear();

			service.get('other');
			service.get('other');

			// Only one construction despite two get() calls.
			expect(MockAssistant).toHaveBeenCalledTimes(1);
		});

		it('returns the same instance whether accessed via get() or send()', async () => {
			mockSend.mockResolvedValue('ok');
			const service = new AssistantService(deps);
			MockAssistant.mockClear();

			const viaGet = service.get('shared');
			await service.send('msg', 'shared');

			// Only one construction — same instance used by both call paths.
			expect(MockAssistant).toHaveBeenCalledTimes(1);
			expect(viaGet.id).toBe('shared');
		});
	});
});
