/**
 * Unit tests for AssistantService (src/main/assistant/service.ts).
 *
 * Assistant is mocked at the module boundary so that MemoryManager,
 * SessionManager, OpenAI, filesystem I/O, and Electron APIs are never
 * exercised. The tests validate the service's own logic: registry
 * management, routing to the correct assistant, lazy creation,
 * approval/reject delegation, and error propagation.
 */

jest.mock('../../../../src/main/assistant/assistant', () => {
	const mockSend = jest.fn<Promise<string>, [string]>();
	const mockReset = jest.fn<Promise<void>, []>();
	const mockApprove = jest.fn();
	const mockReject = jest.fn();
	const mockRespond = jest.fn();
	const mockCancel = jest.fn(() => Promise.resolve());
	const mockGetPending = jest.fn(() => []);
	const mockGetPendingInputs = jest.fn(() => []);
	const mockHasPending = jest.fn(() => false);
	const MockAssistant = jest.fn().mockImplementation((id: string) => ({
		id,
		send: mockSend,
		reset: mockReset,
		approve: mockApprove,
		reject: mockReject,
		respond: mockRespond,
		cancelPending: mockCancel,
		getPendingApprovals: mockGetPending,
		getPendingInputs: mockGetPendingInputs,
		hasPending: mockHasPending,
	}));
	MockAssistant._mockSend = mockSend;
	MockAssistant._mockReset = mockReset;
	MockAssistant._mockApprove = mockApprove;
	MockAssistant._mockReject = mockReject;
	MockAssistant._mockRespond = mockRespond;
	MockAssistant._mockCancel = mockCancel;
	MockAssistant._mockGetPending = mockGetPending;
	MockAssistant._mockGetPendingInputs = mockGetPendingInputs;
	MockAssistant._mockHasPending = mockHasPending;
	return { Assistant: MockAssistant };
});

import { AssistantService } from '../../../../src/main/assistant/service';
import { DEFAULT_ASSISTANT_ID } from '../../../../src/main/assistant/constants';
import { AssistantRegistry } from '../../../../src/main/assistant/registry';
import { Assistant } from '../../../../src/main/assistant/assistant';
import type { StoreService } from '../../../../src/main/store';
import type { CronService } from '../../../../src/main/cron';
import type { LoggerService } from '../../../../src/main/logger';
import type { EventBus } from '../../../../src/main/core/event-bus';
import type { WorkspaceService } from '../../../../src/main/workspace';

type MockAssistantCtor = jest.MockedClass<typeof Assistant> & {
	_mockSend: jest.MockedFunction<(msg: string) => Promise<string>>;
	_mockReset: jest.MockedFunction<() => Promise<void>>;
	_mockApprove: jest.MockedFunction<
		(callId: string, opts?: { alwaysApprove?: boolean; editedArguments?: string }) => Promise<unknown>
	>;
	_mockReject: jest.MockedFunction<
		(
			callId: string,
			opts?: { alwaysReject?: boolean; message?: string }
		) => Promise<unknown>
	>;
	_mockRespond: jest.MockedFunction<(callId: string, answer: string) => Promise<unknown>>;
	_mockCancel: jest.MockedFunction<(reason?: string) => Promise<void>>;
	_mockGetPending: jest.MockedFunction<() => unknown[]>;
	_mockGetPendingInputs: jest.MockedFunction<() => unknown[]>;
	_mockHasPending: jest.MockedFunction<() => boolean>;
};

const MockAssistant = Assistant as unknown as MockAssistantCtor;
const mockSend = MockAssistant._mockSend;
const mockReset = MockAssistant._mockReset;
const mockApprove = MockAssistant._mockApprove;
const mockReject = MockAssistant._mockReject;
const mockRespond = MockAssistant._mockRespond;
const mockCancel = MockAssistant._mockCancel;
const mockGetPending = MockAssistant._mockGetPending;
const mockGetPendingInputs = MockAssistant._mockGetPendingInputs;
const mockHasPending = MockAssistant._mockHasPending;

const stubStore = {} as unknown as StoreService;
const stubCron = {} as unknown as CronService;
const stubLogger = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
} as unknown as LoggerService;
const stubEventBus = {
	broadcast: jest.fn(),
	emit: jest.fn(),
	on: jest.fn(),
} as unknown as EventBus;
const stubWorkspace = {} as unknown as WorkspaceService;
const deps = {
	store: stubStore,
	cron: stubCron,
	logger: stubLogger,
	eventBus: stubEventBus,
	workspace: stubWorkspace,
};

describe('AssistantService', () => {
	beforeEach(() => {
		MockAssistant.mockClear();
		mockSend.mockReset();
		mockReset.mockReset();
		mockApprove.mockReset();
		mockReject.mockReset();
		mockGetPending.mockReset();
		mockGetPending.mockReturnValue([]);
		mockHasPending.mockReset();
		mockHasPending.mockReturnValue(false);
	});

	describe('constructor', () => {
		it('eagerly registers the default assistant on construction', () => {
			new AssistantService(deps);
			expect(MockAssistant).toHaveBeenCalledTimes(1);
			expect(MockAssistant).toHaveBeenCalledWith(
				DEFAULT_ASSISTANT_ID,
				stubStore,
				stubCron,
				stubLogger,
				stubEventBus,
				stubWorkspace,
				undefined
			);
		});

		it('uses DEFAULT_ASSISTANT_ID when no defaultAssistantId option is provided', () => {
			const service = new AssistantService(deps);
			const assistant = service.get();
			expect(assistant.id).toBe(DEFAULT_ASSISTANT_ID);
			expect(MockAssistant).toHaveBeenCalledTimes(1);
		});

		it('registers a custom defaultAssistantId when provided via options', () => {
			new AssistantService(deps, { defaultAssistantId: 'custom' });
			expect(MockAssistant).toHaveBeenCalledTimes(1);
			expect(MockAssistant).toHaveBeenCalledWith(
				'custom',
				stubStore,
				stubCron,
				stubLogger,
				stubEventBus,
				stubWorkspace,
				undefined
			);
		});

		it('uses a provided registry instead of creating a new one', () => {
			const registry = new AssistantRegistry();
			const service = new AssistantService(deps, { registry });
			expect(registry.has(DEFAULT_ASSISTANT_ID)).toBe(true);
			expect(service.get().id).toBe(DEFAULT_ASSISTANT_ID);
		});
	});

	describe('send()', () => {
		it('routes to the default assistant when no assistantId is given', async () => {
			mockSend.mockResolvedValueOnce('hello from main');
			const service = new AssistantService(deps);
			const result = await service.send('ping');
			expect(mockSend).toHaveBeenCalledWith('ping');
			expect(result).toBe('hello from main');
		});

		it('lazily creates a new assistant for an unknown assistantId', async () => {
			mockSend.mockResolvedValue('ok');
			const service = new AssistantService(deps);
			MockAssistant.mockClear();
			await service.send('msg', 'brand-new');
			expect(MockAssistant).toHaveBeenCalledTimes(1);
		});

		it('reuses the same assistant instance on repeated calls with the same id', async () => {
			mockSend.mockResolvedValue('ok');
			const service = new AssistantService(deps);
			MockAssistant.mockClear();
			await service.send('first', 'repeat-id');
			await service.send('second', 'repeat-id');
			expect(MockAssistant).toHaveBeenCalledTimes(1);
		});

		it('propagates a rejection from the underlying assistant send()', async () => {
			mockSend.mockRejectedValueOnce(new Error('OpenAI unavailable'));
			const service = new AssistantService(deps);
			await expect(service.send('ping')).rejects.toThrow('OpenAI unavailable');
		});
	});

	describe('reset()', () => {
		it('routes to the default assistant', async () => {
			mockReset.mockResolvedValueOnce(undefined);
			const service = new AssistantService(deps);
			await service.reset();
			expect(mockReset).toHaveBeenCalledTimes(1);
		});
	});

	describe('approve()/reject()', () => {
		it('forwards approve to the underlying assistant', async () => {
			mockApprove.mockResolvedValueOnce({ status: 'completed', text: 'ok', pending: [] });
			const service = new AssistantService(deps);
			const result = await service.approve('c1', { alwaysApprove: true });
			expect(mockApprove).toHaveBeenCalledWith('c1', { alwaysApprove: true });
			expect(result.status).toBe('completed');
		});

		it('forwards reject to the underlying assistant', async () => {
			mockReject.mockResolvedValueOnce({ status: 'completed', text: 'ok', pending: [] });
			const service = new AssistantService(deps);
			await service.reject('c1', { message: 'no' });
			expect(mockReject).toHaveBeenCalledWith('c1', { message: 'no' });
		});

		it('exposes pending approvals and hasPending from the underlying assistant', () => {
			mockHasPending.mockReturnValue(true);
			mockGetPending.mockReturnValue([
				{ callId: 'c1', toolName: 'exec', arguments: '{}' },
			]);
			const service = new AssistantService(deps);
			expect(service.hasPending()).toBe(true);
			expect(service.getPendingApprovals()).toEqual([
				{ callId: 'c1', toolName: 'exec', arguments: '{}' },
			]);
		});
	});

	describe('get()', () => {
		it('returns the default assistant when called with no argument', () => {
			const service = new AssistantService(deps);
			expect(service.get().id).toBe(DEFAULT_ASSISTANT_ID);
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
			expect(MockAssistant).toHaveBeenCalledTimes(1);
		});
	});
});
