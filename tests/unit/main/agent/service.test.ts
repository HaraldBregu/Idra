import { promises as fs } from 'node:fs';
import type { ProviderAdapter, ProviderEvent, ProviderStreamRequest } from '../../../../src/main/provider/types';
import { AgentService } from '../../../../src/main/service';
import { AgentRunLogger } from '../../../../src/main/run-logger';
import { SkillsService } from '../../../../src/main/skills';
import type { AgentTool } from '../../../../src/main/tools/types';
import { makeLogger, makeTempDir } from '../test-helpers';

function provider(events: ProviderEvent[]): ProviderAdapter {
	return {
		async *stream() {
			for (const event of events) yield event;
		},
	};
}

function providerTurns(turns: ProviderEvent[][]): ProviderAdapter {
	let index = 0;
	return {
		async *stream() {
			const events = turns[index++] ?? [];
			for (const event of events) yield event;
		},
	};
}

function makeDeps() {
	const providerRecord = {
		id: 'openai',
		name: 'OpenAI',
		apiKey: 'sk-test',
		baseUrl: 'https://api.openai.com/v1',
	};
	const store = {
		getAgentService: jest.fn(() => ({
			provider: { id: 'openai', name: 'OpenAI', baseUrl: providerRecord.baseUrl },
			model: { id: 'gpt-test', name: 'GPT Test' },
		})),
		getProviderById: jest.fn(() => providerRecord),
	};
	return {
		store,
		cron: {} as never,
		logger: makeLogger() as never,
		eventBus: {
			broadcast: jest.fn(),
			emit: jest.fn(),
			on: jest.fn(),
			off: jest.fn(),
			sendTo: jest.fn(),
		} as never,
		userDataDirectory: {
			getRootPath: jest.fn(() => '/workspace'),
			ensureRoot: jest.fn(async () => '/workspace'),
			resolve: jest.fn((...segments: string[]) => ['/workspace', ...segments].join('/')),
			resolveExisting: jest.fn(async (...segments: string[]) => ['/workspace', ...segments].join('/')),
		} as never,
		workspace: { getRootPath: jest.fn(() => '/workspace') } as never,
	};
}

describe('AgentService', () => {
	it('drives the new agent loop directly from the IPC-facing service', async () => {
		const sessionBaseDir = await makeTempDir();
		const runLogDir = await makeTempDir();
		const deps = makeDeps();
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: runLogDir }),
			providerFactory: jest.fn(() => provider([
				{ type: 'message_start' },
				{ type: 'text_delta', text: 'hello' },
				{ type: 'message_end', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 2 } },
			])),
			toolsFactory: () => [],
		});

		await expect(service.send('hi')).resolves.toBe('hello');
		expect(deps.eventBus.broadcast).toHaveBeenCalledWith('agent:response', expect.objectContaining({ delta: 'hello' }));
		await expect(service.getHistory()).resolves.toEqual(expect.arrayContaining([
			expect.objectContaining({ role: 'user', content: 'hi' }),
			expect.objectContaining({ role: 'assistant' }),
		]));

		const records = await new AgentRunLogger('main', { baseDir: runLogDir }).readAll();
		expect(records.map((record) => record.event)).toEqual(expect.arrayContaining(['start', 'finish']));
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
		await fs.rm(runLogDir, { recursive: true, force: true });
	});

	it('blocks before model inference without persisting the raw prompt', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const stream = jest.fn(async function* () {
			yield { type: 'text_delta' as const, text: 'should not run' };
		});
		const providerFactory = jest.fn(() => ({ stream }));
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory,
			toolsFactory: () => [],
			beforeAgentRunHooks: [
				() => ({
					outcome: 'block',
					reason: 'internal secret policy',
					message: 'Please remove sensitive input and try again.',
					category: 'privacy',
				}),
			],
		});

		await expect(service.send('my password is swordfish')).resolves.toBe(
			'Please remove sensitive input and try again.'
		);
		expect(providerFactory).toHaveBeenCalled();
		expect(stream).not.toHaveBeenCalled();
		const history = await service.getHistory();
		expect(JSON.stringify(history)).toContain('Please remove sensitive input and try again.');
		expect(JSON.stringify(history)).not.toContain('swordfish');
		expect(JSON.stringify(history)).not.toContain('internal secret policy');
		expect(deps.eventBus.broadcast).toHaveBeenCalledWith(
			'agent:response',
			expect.objectContaining({ type: 'run_state', label: 'beforeAgentRunBlocked' })
		);
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('builds tools with run-scoped agent context', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const contexts: unknown[] = [];
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () => provider([
				{ type: 'message_start' },
				{ type: 'text_delta', text: 'ok' },
				{ type: 'message_end', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
			]),
			toolsFactory: async (context) => {
				contexts.push(context);
				return [];
			},
		});

		await expect(service.send('hi')).resolves.toBe('ok');
		expect(contexts).toHaveLength(1);
		expect(contexts[0]).toMatchObject({
			agentId: 'main',
			providerId: 'openai',
			model: 'gpt-test',
			workspace: '/workspace',
			session: expect.objectContaining({ id: 'main' }),
			runId: expect.any(String),
			signal: expect.any(AbortSignal),
		});
		expect((contexts[0] as { services?: unknown }).services).toBe(deps);
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('does not expose tools or skill guidance when a request can be answered directly', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const skills = new SkillsService(deps.logger as never);
		const service = new AgentService(
			{ ...deps, skills },
			{
				sessionBaseDir,
				runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
				providerFactory: () => ({
					async *stream(req) {
						requests.push(req);
						yield { type: 'text_delta' as const, text: 'roses are red' };
						yield {
							type: 'message_end' as const,
							stopReason: 'end_turn',
							usage: { inputTokens: 1, outputTokens: 1 },
						};
					},
				}),
				toolsFactory: () => [
					{
						name: 'read',
						description: 'Read files',
						schema: { type: 'object', properties: {}, additionalProperties: false },
						execute: jest.fn(),
					},
				],
			}
		);

		await expect(service.send('write a short poem about spring')).resolves.toBe('roses are red');
		expect(requests[0]!.tools).toEqual([]);
		expect(requests[0]!.system).toContain('No tools are available for this turn');
		expect(requests[0]!.system).not.toContain('## Skill guidance');
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('skips tool and workspace context loading for direct-answer prompts', async () => {
		const sessionBaseDir = await makeTempDir();
		const runLogDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const workspace = {
			getRootPath: jest.fn(() => '/workspace'),
			isBootstrapPending: jest.fn(async () => false),
			loadContextFiles: jest.fn(async () => []),
		};
		const toolsFactory = jest.fn(() => [
			{
				name: 'read',
				description: 'Read files',
				schema: { type: 'object', properties: {}, additionalProperties: false },
				execute: jest.fn(),
			},
		]);
		const service = new AgentService(
			{ ...deps, workspace: workspace as never },
			{
				sessionBaseDir,
				runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: runLogDir }),
				providerFactory: () => ({
					async *stream(req) {
						requests.push(req);
						yield { type: 'text_delta' as const, text: 'hello' };
						yield {
							type: 'message_end' as const,
							stopReason: 'end_turn',
							usage: { inputTokens: 1, outputTokens: 1 },
						};
					},
				}),
				toolsFactory,
			}
		);

		await expect(service.send('hello there')).resolves.toBe('hello');
		expect(toolsFactory).not.toHaveBeenCalled();
		expect(workspace.loadContextFiles).not.toHaveBeenCalled();
		expect(requests[0]!.tools).toEqual([]);
		expect(requests[0]!.system).toContain('No tools are available for this turn');

		const records = await new AgentRunLogger('main', { baseDir: runLogDir }).readAll();
		expect(records).toContainEqual(
			expect.objectContaining({
				event: 'start',
				directAnswer: true,
				toolPolicyReason: 'no tool is required to answer safely',
				tools: [],
			})
		);
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
		await fs.rm(runLogDir, { recursive: true, force: true });
	});

	it('exposes available tools when the user asks about tool capabilities', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () => ({
				async *stream(req) {
					requests.push(req);
					yield { type: 'text_delta' as const, text: 'I have tools.' };
					yield {
						type: 'message_end' as const,
						stopReason: 'end_turn',
						usage: { inputTokens: 1, outputTokens: 1 },
					};
				},
			}),
			toolsFactory: () => [
				{
					name: 'read',
					description: 'Read files',
					schema: { type: 'object', properties: {}, additionalProperties: false },
					execute: jest.fn(),
				},
			],
		});

		await expect(service.send('Do you have any internal tools?')).resolves.toBe('I have tools.');
		expect(requests[0]!.tools.map((tool) => tool.name)).toEqual(['read']);
		expect(requests[0]!.system).toContain('**read**');
		expect(requests[0]!.system).not.toContain('No tools are available for this turn');
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('executes legacy approval-marked tools without IPC pending approval', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const execute = jest.fn(async () => ({
			status: 'ok' as const,
			content: [{ type: 'text' as const, text: 'tool done' }],
		}));
		const tool: AgentTool = {
			name: 'needs_approval',
			description: 'Legacy approval-marked tool',
			schema: { type: 'object' },
			needsApproval: true,
			execute,
		};
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () => providerTurns([
				[
					{ type: 'tool_call_start', id: 'tc1', name: 'needs_approval' },
					{ type: 'tool_call_args_delta', id: 'tc1', jsonDelta: '{"ok":true}' },
					{ type: 'tool_call_end', id: 'tc1' },
					{ type: 'message_end', stopReason: 'tool_use', usage: { inputTokens: 1, outputTokens: 1 } },
				],
				[
					{ type: 'text_delta', text: 'finished' },
					{ type: 'message_end', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
				],
			]),
			toolsFactory: () => [tool],
		});

			const send = service.send('execute the needs_approval tool');
			await expect(send).resolves.toBe('finished');
			expect(service.getPending().approvals).toEqual([]);
			expect(execute).toHaveBeenCalledWith({ ok: true }, expect.any(Object));
			expect(deps.eventBus.broadcast).not.toHaveBeenCalledWith(
				'agent:response',
				expect.objectContaining({ type: 'run_state', state: 'waiting_for_approval' })
			);
			await fs.rm(sessionBaseDir, { recursive: true, force: true });
		});

	it('broadcasts tool call lifecycle events to the renderer stream', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const execute = jest.fn(async () => ({
			status: 'ok' as const,
			content: [{ type: 'text' as const, text: 'pong' }],
		}));
		const tool: AgentTool = {
			name: 'ping',
			description: 'Ping',
			schema: { type: 'object' },
			execute,
		};
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () => providerTurns([
				[
					{ type: 'tool_call_start', id: 'tc1', name: 'ping' },
					{ type: 'tool_call_args_delta', id: 'tc1', jsonDelta: '{"value":1}' },
					{ type: 'tool_call_end', id: 'tc1' },
					{ type: 'message_end', stopReason: 'tool_use', usage: { inputTokens: 1, outputTokens: 1 } },
				],
				[
					{ type: 'text_delta', text: 'finished' },
					{ type: 'message_end', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
				],
			]),
			toolsFactory: () => [tool],
		});

		await expect(service.send('execute the ping tool')).resolves.toBe('finished');

		const responseEvents = (deps.eventBus.broadcast as jest.Mock).mock.calls
			.filter(([channel]) => channel === 'agent:response')
			.map(([, payload]) => payload);
		expect(responseEvents.map((event) => event.type)).toEqual(
			expect.arrayContaining([
				'tool_call_start',
				'tool_call_args_delta',
				'tool_call_input',
				'tool_call_result',
				'text_delta',
			])
		);
		expect(responseEvents).toContainEqual(
			expect.objectContaining({
				type: 'tool_call_result',
				toolCallId: 'tc1',
				toolName: 'ping',
				outputText: 'pong',
				status: 'ok',
			})
		);
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('adds compact skill guidance and execute_skill tool when skills are available', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const skills = new SkillsService(deps.logger as never);
		const service = new AgentService(
			{ ...deps, skills },
			{
				sessionBaseDir,
				runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
				providerFactory: () => ({
					async *stream(req) {
						requests.push(req);
						yield { type: 'text_delta' as const, text: 'done' };
						yield {
							type: 'message_end' as const,
							stopReason: 'end_turn',
							usage: { inputTokens: 1, outputTokens: 1 },
						};
					},
				}),
				toolsFactory: () => [],
			}
		);

		await expect(service.send('summarize this document')).resolves.toBe('done');
		expect(requests[0]!.tools.map((tool) => tool.name)).toContain('execute_skill');
		expect(requests[0]!.system).toContain('## Skill guidance');
		expect(requests[0]!.system).toContain('summarize-document@1.0.0');
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('resets persisted session and cancels pending requests', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () => provider([
				{ type: 'message_start' },
				{ type: 'text_delta', text: 'ok' },
				{ type: 'message_end', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } },
			]),
			toolsFactory: () => [],
		});
		await service.send('hi');
		await expect(service.getHistory()).resolves.toHaveLength(2);
		await service.reset();
		await expect(service.getHistory()).resolves.toEqual([]);
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});
});
