/**
 * Unit tests for Assistant (src/main/assistant/assistant.ts).
 *
 * MemoryManager and SessionManager are mocked so no filesystem or template
 * I/O is exercised. The OpenAI client is supplied as a fake via the
 * Assistant `openAIFactory` override and tools are injected explicitly so
 * the test controls the full input/output of the agent loop.
 */

jest.mock('../../../../src/main/assistant/memory', () => ({
	MemoryManager: jest.fn().mockImplementation(() => ({
		init: jest.fn().mockResolvedValue(undefined),
		clear: jest.fn().mockResolvedValue(undefined),
	})),
	buildSystemPrompt: jest.fn().mockResolvedValue('SYSTEM'),
}));

jest.mock('../../../../src/main/assistant/session', () => ({
	SessionManager: jest.fn().mockImplementation(() => ({
		init: jest.fn().mockResolvedValue(undefined),
		load: jest.fn().mockResolvedValue([]),
		append: jest.fn().mockResolvedValue(undefined),
		clear: jest.fn().mockResolvedValue(undefined),
	})),
}));

import type OpenAI from 'openai';
import { Assistant } from '../../../../src/main/assistant/assistant';
import { AssistantRunLogger } from '../../../../src/main/assistant/run-logger';
import { Tool } from '../../../../src/main/assistant/tools/base';
import type { StoreService } from '../../../../src/main/store';
import type { CronService } from '../../../../src/main/cron';
import type { LoggerService } from '../../../../src/main/logger';
import type { EventBus } from '../../../../src/main/core/event-bus';
import type { WorkspaceService } from '../../../../src/main/workspace';

class StubTool extends Tool {
	name: string;
	description = 'stub';
	parameters = {};
	executed: Array<Record<string, unknown>> = [];
	private approval: boolean;

	constructor(name: string, opts: { needsApproval?: boolean } = {}) {
		super();
		this.name = name;
		this.approval = opts.needsApproval ?? false;
	}

	needsApproval(): boolean {
		return this.approval;
	}

	async execute(args: Record<string, unknown>): Promise<string> {
		this.executed.push(args);
		return `executed ${this.name}`;
	}
}

class AskHumanStub extends Tool {
	name = 'ask_human';
	description = 'Ask human';
	parameters = {};
	get kind(): 'input' {
		return 'input';
	}
	async execute(): Promise<string> {
		return '';
	}
}

function makeOpenAI(scripted: Array<unknown>): OpenAI {
	const create = jest.fn();
	for (const value of scripted) {
		create.mockImplementationOnce(async () => value);
	}
	return { responses: { create } } as unknown as OpenAI;
}

function makeDeps(): {
	store: StoreService;
	cron: CronService;
	logger: LoggerService;
	eventBus: EventBus;
	workspace: WorkspaceService;
} {
	const store = {
		getAssistantService: () => ({
			provider: { id: 'openai' },
			model: { id: 'gpt-x', name: 'gpt-x' },
		}),
		getProviderById: () => ({ id: 'openai', apiKey: 'sk-test' }),
		getConnectors: () => [],
	} as unknown as StoreService;
	const logger = {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	} as unknown as LoggerService;
	const eventBus = {
		broadcast: jest.fn(),
		emit: jest.fn(),
		on: jest.fn(),
		sendTo: jest.fn(),
		off: jest.fn(),
	} as unknown as EventBus;
	return {
		store,
		cron: {} as CronService,
		logger,
		eventBus,
		workspace: {} as WorkspaceService,
	};
}

function makeAssistant(opts: {
	tools: Tool[];
	openai: OpenAI;
	runLogger?: AssistantRunLogger;
}): { assistant: Assistant; eventBus: EventBus } {
	const deps = makeDeps();
	const assistant = new Assistant(
		'test',
		deps.store,
		deps.cron,
		deps.logger,
		deps.eventBus,
		deps.workspace,
		undefined,
		{
			openAIFactory: () => opts.openai,
			toolsFactory: () => opts.tools,
			runLogger: opts.runLogger,
		}
	);
	return { assistant, eventBus: deps.eventBus };
}

describe('Assistant', () => {
	let tmpRunLogger: AssistantRunLogger;
	let tmpDir: string;

	beforeEach(async () => {
		const { promises: fs } = await import('node:fs');
		const os = await import('node:os');
		const path = await import('node:path');
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-assistant-'));
		tmpRunLogger = new AssistantRunLogger('test', { baseDir: tmpDir });
	});

	afterEach(async () => {
		const { promises: fs } = await import('node:fs');
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	describe('send()', () => {
		it('returns the assistant text when the model emits no tool calls', async () => {
			const openai = makeOpenAI([
				{
					output: [],
					output_text: 'hi human',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				},
			]);
			const { assistant } = makeAssistant({ tools: [], openai, runLogger: tmpRunLogger });
			const text = await assistant.send('hello');
			expect(text).toBe('hi human');
			expect(assistant.hasPending()).toBe(false);
		});

		it('cancels the pending run and starts fresh when send() is called again', async () => {
			const tool = new StubTool('write_file', { needsApproval: true });
			const openai = makeOpenAI([
				{
					output: [
						{
							type: 'function_call',
							name: 'write_file',
							arguments: '{}',
							call_id: 'c1',
						},
					],
					output_text: '',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				},
				{
					output: [],
					output_text: 'second response',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				},
			]);
			const { assistant } = makeAssistant({ tools: [tool], openai, runLogger: tmpRunLogger });
			await assistant.send('do it');
			expect(assistant.hasPending()).toBe(true);

			const second = await assistant.send('never mind, do something else');
			expect(second).toBe('second response');
			expect(assistant.hasPending()).toBe(false);

			const records = await tmpRunLogger.readAll();
			const cancelled = records.find(
				(r) => r.event === 'finish' && 'status' in r && r.status === 'cancelled'
			);
			expect(cancelled).toBeDefined();
		});

		it('writes start and finish records to the run logger', async () => {
			const openai = makeOpenAI([
				{
					output: [],
					output_text: 'ok',
					usage: { input_tokens: 3, output_tokens: 2, total_tokens: 5 },
				},
			]);
			const { assistant } = makeAssistant({ tools: [], openai, runLogger: tmpRunLogger });
			await assistant.send('hello');
			const records = await tmpRunLogger.readAll();
			const events = records.map((r) => r.event);
			expect(events[0]).toBe('start');
			expect(events).toContain('finish');
		});
	});

	describe('approve()/reject()', () => {
		it('runs the pending tool and finishes after approve()', async () => {
			const tool = new StubTool('write_file', { needsApproval: true });
			const openai = makeOpenAI([
				{
					output: [
						{
							type: 'function_call',
							name: 'write_file',
							arguments: '{"path":"/x"}',
							call_id: 'c1',
						},
					],
					output_text: '',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				},
				{
					output: [],
					output_text: 'wrote it',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				},
			]);
			const { assistant } = makeAssistant({ tools: [tool], openai, runLogger: tmpRunLogger });

			await assistant.send('please write');
			expect(assistant.hasPending()).toBe(true);
			const pending = assistant.getPendingApprovals();
			expect(pending).toEqual([
				{ callId: 'c1', toolName: 'write_file', arguments: '{"path":"/x"}' },
			]);

			const result = await assistant.approve('c1');
			expect(result.status).toBe('completed');
			expect(result.text).toBe('wrote it');
			expect(tool.executed).toEqual([{ path: '/x' }]);
			expect(assistant.hasPending()).toBe(false);
		});

		it('skips execution and continues after reject()', async () => {
			const tool = new StubTool('write_file', { needsApproval: true });
			const openai = makeOpenAI([
				{
					output: [
						{
							type: 'function_call',
							name: 'write_file',
							arguments: '{"path":"/x"}',
							call_id: 'c1',
						},
					],
					output_text: '',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				},
				{
					output: [],
					output_text: 'never mind',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				},
			]);
			const { assistant } = makeAssistant({ tools: [tool], openai, runLogger: tmpRunLogger });
			await assistant.send('go');
			const result = await assistant.reject('c1', { message: 'do not do that' });
			expect(result.status).toBe('completed');
			expect(tool.executed).toHaveLength(0);
		});

		it('throws when there is nothing to approve', async () => {
			const openai = makeOpenAI([
				{
					output: [],
					output_text: 'ok',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				},
			]);
			const { assistant } = makeAssistant({ tools: [], openai, runLogger: tmpRunLogger });
			await assistant.send('hi');
			await expect(assistant.approve('nope')).rejects.toThrow(/No pending approvals/);
		});

		it('broadcasts pending event when approvals are required', async () => {
			const tool = new StubTool('write_file', { needsApproval: true });
			const openai = makeOpenAI([
				{
					output: [
						{
							type: 'function_call',
							name: 'write_file',
							arguments: '{}',
							call_id: 'c1',
						},
					],
					output_text: '',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				},
			]);
			const { assistant, eventBus } = makeAssistant({
				tools: [tool],
				openai,
				runLogger: tmpRunLogger,
			});
			await assistant.send('go');
			expect(eventBus.broadcast).toHaveBeenCalledWith(
				'assistant:pending',
				expect.objectContaining({
					assistantId: 'test',
					pending: expect.any(Array),
				})
			);
		});
	});

	describe('respond() (ask_human flow)', () => {
		it('surfaces ask_human as a pending input and resumes with the answer as tool output', async () => {
			const ask = new AskHumanStub();
			const openai = makeOpenAI([
				{
					output: [
						{
							type: 'function_call',
							name: 'ask_human',
							arguments: '{"question":"Where?","suggestions":["a","b"]}',
							call_id: 'c1',
						},
					],
					output_text: '',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				},
				{
					output: [],
					output_text: 'ok placed it',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				},
			]);
			const { assistant, eventBus } = makeAssistant({
				tools: [ask],
				openai,
				runLogger: tmpRunLogger,
			});

			await assistant.send('save my notes');
			expect(assistant.hasPending()).toBe(true);
			expect(assistant.getPendingInputs()).toEqual([
				{
					callId: 'c1',
					toolName: 'ask_human',
					question: 'Where?',
					suggestions: ['a', 'b'],
				},
			]);
			expect(eventBus.broadcast).toHaveBeenCalledWith(
				'assistant:pending',
				expect.objectContaining({
					pendingInputs: expect.arrayContaining([
						expect.objectContaining({ question: 'Where?' }),
					]),
				})
			);

			const result = await assistant.respond('c1', '~/Documents/notes.md');
			expect(result.status).toBe('completed');
			expect(result.text).toBe('ok placed it');
			expect(assistant.hasPending()).toBe(false);

			const records = await tmpRunLogger.readAll();
			expect(records.some((r) => r.event === 'input_request')).toBe(true);
			expect(records.some((r) => r.event === 'input_resolution')).toBe(true);
		});
	});

	describe('cancelPending()', () => {
		it('drops the paused run and logs a cancelled finish', async () => {
			const tool = new StubTool('write_file', { needsApproval: true });
			const openai = makeOpenAI([
				{
					output: [
						{
							type: 'function_call',
							name: 'write_file',
							arguments: '{}',
							call_id: 'c1',
						},
					],
					output_text: '',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				},
			]);
			const { assistant } = makeAssistant({ tools: [tool], openai, runLogger: tmpRunLogger });
			await assistant.send('do it');
			await assistant.cancelPending('explicit');
			expect(assistant.hasPending()).toBe(false);
			const records = await tmpRunLogger.readAll();
			const cancelled = records.find(
				(r) => r.event === 'finish' && 'status' in r && r.status === 'cancelled'
			);
			expect(cancelled).toBeDefined();
		});

		it('is a no-op when nothing is pending', async () => {
			const openai = makeOpenAI([]);
			const { assistant } = makeAssistant({ tools: [], openai, runLogger: tmpRunLogger });
			await expect(assistant.cancelPending('explicit')).resolves.toBeUndefined();
		});
	});

	describe('approve() with editedArguments', () => {
		it('executes the tool with the edited arguments instead of the original', async () => {
			const tool = new StubTool('write_file', { needsApproval: true });
			const openai = makeOpenAI([
				{
					output: [
						{
							type: 'function_call',
							name: 'write_file',
							arguments: '{"path":"/wrong"}',
							call_id: 'c1',
						},
					],
					output_text: '',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				},
				{
					output: [],
					output_text: 'ok',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				},
			]);
			const { assistant } = makeAssistant({ tools: [tool], openai, runLogger: tmpRunLogger });
			await assistant.send('go');
			await assistant.approve('c1', { editedArguments: '{"path":"/right"}' });
			expect(tool.executed).toEqual([{ path: '/right' }]);
		});
	});

	describe('config validation', () => {
		it('fails fast when no provider is configured', async () => {
			const deps = makeDeps();
			(deps.store as unknown as { getAssistantService: () => undefined }).getAssistantService =
				() => undefined;
			const assistant = new Assistant(
				'test',
				deps.store,
				deps.cron,
				deps.logger,
				deps.eventBus,
				deps.workspace,
				undefined,
				{
					openAIFactory: () => ({}) as OpenAI,
					toolsFactory: () => [],
					runLogger: tmpRunLogger,
				}
			);
			await expect(assistant.send('hi')).rejects.toThrow(/provider not configured/);
		});
	});
});
