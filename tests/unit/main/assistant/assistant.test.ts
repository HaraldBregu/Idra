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

		it('throws when called while approvals are pending', async () => {
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
			expect(assistant.hasPending()).toBe(true);
			await expect(assistant.send('again')).rejects.toThrow(/pending approvals/);
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
