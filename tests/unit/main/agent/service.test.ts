import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
	ProviderAdapter,
	ProviderEvent,
	ProviderStreamRequest,
} from '../../../../src/main/provider/types';
import { ConnectorsService } from '../../../../src/main/connectors';
import { AgentService } from '../../../../src/main/service';
import { AgentRunLogger } from '../../../../src/main/run-logger';
import { SkillsService } from '../../../../src/main/skills';
import type { SkillPromptChoice } from '../../../../src/main/skills/types';
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

function makeDeps(workspace = '/workspace') {
	const providerRecord = {
		id: 'openai',
		name: 'OpenAI',
		apiKey: 'sk-test',
		baseUrl: 'https://api.openai.com/v1',
	};
	const store = {
		getAssistantOperator: jest.fn(() => ({
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
			getRootPath: jest.fn(() => workspace),
			ensureRoot: jest.fn(async () => workspace),
			resolve: jest.fn((...segments: string[]) => [workspace, ...segments].join('/')),
			resolveExisting: jest.fn(async (...segments: string[]) =>
				[workspace, ...segments].join('/')
			),
		} as never,
		workspace: {
			getRootPath: jest.fn(() => workspace),
			isBootstrapPending: jest.fn(async () => false),
			loadContextFiles: jest.fn(async () => []),
			listWorkspaceFiles: jest.fn(async () => []),
			readWorkspaceFile: jest.fn(),
			writeWorkspaceFile: jest.fn(),
			completeBootstrap: jest.fn(),
		} as never,
		startupFiles: {
			getRootPath: jest.fn(() => `${workspace}/agent/workspaces/main`),
			ensureReady: jest.fn(async () => undefined),
			isBootstrapPending: jest.fn(async () => false),
			loadContextFiles: jest.fn(async () => []),
			listFiles: jest.fn(async () => []),
			readFile: jest.fn(),
			writeFile: jest.fn(),
			completeBootstrap: jest.fn(),
		} as never,
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
			providerFactory: jest.fn(() =>
				provider([
					{ type: 'message_start' },
					{ type: 'text_delta', text: 'hello' },
					{
						type: 'message_end',
						stopReason: 'end_turn',
						usage: { inputTokens: 1, outputTokens: 2 },
					},
				])
			),
			toolsFactory: () => [],
		});

		await expect(service.send('hi')).resolves.toBe('hello');
		expect(deps.eventBus.broadcast).toHaveBeenCalledWith(
			'agent:response',
			expect.objectContaining({ delta: 'hello' })
		);
		await expect(service.getHistory()).resolves.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ role: 'user', content: 'hi' }),
				expect.objectContaining({ role: 'assistant' }),
			])
		);

		const records = await new AgentRunLogger('main', { baseDir: runLogDir }).readAll();
		expect(records.map((record) => record.event)).toEqual(
			expect.arrayContaining(['start', 'finish'])
		);
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
		await fs.rm(runLogDir, { recursive: true, force: true });
	});

	it('passes saved OpenAI model effort into provider requests', async () => {
		const sessionBaseDir = await makeTempDir();
		const runLogDir = await makeTempDir();
		const deps = makeDeps();
		deps.store.getAssistantOperator.mockReturnValue({
			provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
			model: { id: 'gpt-5.5', name: 'GPT-5.5', effort: 'xhigh' },
		});
		const requests: ProviderStreamRequest[] = [];
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: runLogDir }),
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
		});

		await expect(service.send('hi')).resolves.toBe('done');
		expect(requests[0]).toMatchObject({ model: 'gpt-5.5', effort: 'xhigh' });
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
		await fs.rm(runLogDir, { recursive: true, force: true });
	});

	it('uses per-run provider and model overrides', async () => {
		const sessionBaseDir = await makeTempDir();
		const runLogDir = await makeTempDir();
		const deps = makeDeps();
		deps.store.getProviderById.mockImplementation((id: string) => {
			if (id === 'anthropic') {
				return {
					id: 'anthropic',
					name: 'Anthropic',
					apiKey: 'sk-ant-test',
					baseUrl: 'https://api.anthropic.com',
				};
			}
			return {
				id: 'openai',
				name: 'OpenAI',
				apiKey: 'sk-test',
				baseUrl: 'https://api.openai.com/v1',
			};
		});
		const requests: ProviderStreamRequest[] = [];
		const contexts: unknown[] = [];
		const providerFactory = jest.fn(() => ({
			async *stream(req) {
				requests.push(req);
				yield { type: 'text_delta' as const, text: 'done' };
				yield {
					type: 'message_end' as const,
					stopReason: 'end_turn',
					usage: { inputTokens: 1, outputTokens: 1 },
				};
			},
		}));
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: runLogDir }),
			providerFactory,
			toolsFactory: (context) => {
				contexts.push(context);
				return [];
			},
		});

		await expect(
			service.send('read a file', 'main', {
				providerId: ' Anthropic ',
				model: 'claude-test',
			})
		).resolves.toBe('done');
		expect(deps.store.getProviderById).toHaveBeenCalledWith('anthropic');
		expect(providerFactory).toHaveBeenCalledWith({
			id: 'anthropic',
			apiKey: 'sk-ant-test',
			baseURL: 'https://api.anthropic.com',
		});
		expect(requests[0]).toMatchObject({ model: 'claude-test', effort: undefined });
		expect(contexts[0]).toMatchObject({
			providerId: 'anthropic',
			model: 'claude-test',
		});
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
		await fs.rm(runLogDir, { recursive: true, force: true });
	});

	it('rejects unsupported OpenAI model effort before calling the provider', async () => {
		const sessionBaseDir = await makeTempDir();
		const runLogDir = await makeTempDir();
		const deps = makeDeps();
		deps.store.getAssistantOperator.mockReturnValue({
			provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
			model: { id: 'gpt-5.4-mini', name: 'GPT-5.4 mini', effort: 'minimal' },
		});
		const providerFactory = jest.fn(() =>
			provider([
				{ type: 'message_start' },
				{ type: 'text_delta', text: 'should not run' },
			])
		);
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: runLogDir }),
			providerFactory,
			toolsFactory: () => [],
		});

		await expect(service.send('hi')).rejects.toThrow(
			'Reasoning effort "minimal" is not supported for model "gpt-5.4-mini"'
		);
		expect(providerFactory).not.toHaveBeenCalled();
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
			providerFactory: () =>
				provider([
					{ type: 'message_start' },
					{ type: 'text_delta', text: 'ok' },
					{
						type: 'message_end',
						stopReason: 'end_turn',
						usage: { inputTokens: 1, outputTokens: 1 },
					},
				]),
			toolsFactory: async (context) => {
				contexts.push(context);
				return [];
			},
		});

		await expect(service.send('read a file')).resolves.toBe('ok');
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

	it('runs a cron turn in its own session while using the main agent context', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const contexts: unknown[] = [];
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () =>
				provider([
					{ type: 'message_start' },
					{ type: 'text_delta', text: 'cron ok' },
					{
						type: 'message_end',
						stopReason: 'end_turn',
						usage: { inputTokens: 1, outputTokens: 1 },
					},
				]),
			toolsFactory: async (context) => {
				contexts.push(context);
				return [];
			},
		});

		await expect(
			service.send('read a file for cron', 'main', {
				sessionId: 'cron:job-1',
				cronContext: { role: 'cron-self', jobId: 'job-1', agentId: 'main' },
			})
		).resolves.toBe('cron ok');

		expect(contexts[0]).toMatchObject({
			agentId: 'main',
			session: expect.objectContaining({ id: 'cron:job-1' }),
		});
		expect(deps.startupFiles.isBootstrapPending).toHaveBeenCalledWith('main');
		expect(deps.startupFiles.isBootstrapPending).not.toHaveBeenCalledWith('cron:job-1');
		expect(deps.eventBus.broadcast).toHaveBeenCalledWith(
			'agent:response',
			expect.objectContaining({ agentId: 'cron:job-1', delta: 'cron ok' })
		);
		await expect(service.getHistory()).resolves.toEqual([]);
		await expect(service.getHistory('cron:job-1')).resolves.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ role: 'user', content: 'read a file for cron' }),
			])
		);
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

	it('skips tool and startup context loading for direct-answer prompts', async () => {
		const sessionBaseDir = await makeTempDir();
		const runLogDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const startupFiles = {
			getRootPath: jest.fn(() => '/workspace'),
			ensureReady: jest.fn(async () => undefined),
			isBootstrapPending: jest.fn(async () => false),
			loadContextFiles: jest.fn(async () => []),
			listFiles: jest.fn(async () => []),
			readFile: jest.fn(),
			writeFile: jest.fn(),
			completeBootstrap: jest.fn(),
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
			{ ...deps, startupFiles: startupFiles as never },
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
		expect(startupFiles.loadContextFiles).not.toHaveBeenCalled();
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

	it('uses provider-safe aliases in service-built tool prompts and definitions', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const service = new AgentService(deps, {
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
			toolsFactory: () => [
				{
					name: 'Bad Tool!',
					description: 'Read workspace files with an unsafe source name.',
					schema: { type: 'object', properties: {}, additionalProperties: false },
					execute: jest.fn(),
				},
			],
		});

		await expect(service.send('read a workspace file with the bad tool')).resolves.toBe('done');
		expect(requests[0]!.tools.map((tool) => tool.name)).toEqual(['bad_tool']);
		expect(requests[0]!.system).toContain('**bad_tool**');
		expect(requests[0]!.system).toContain('Tool: bad_tool');
		expect(requests[0]!.system).not.toContain('**Bad Tool!**');
		expect(requests[0]!.system).not.toContain('Tool: Bad Tool!');
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('filters the tool surface with an explicit allowlist', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const makeAgentTool = (name: string, description: string): AgentTool => ({
			name,
			description,
			schema: { type: 'object', properties: {}, additionalProperties: false },
			execute: jest.fn(),
		});
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () => ({
				async *stream(req) {
					requests.push(req);
					yield { type: 'text_delta' as const, text: 'allowed tools' };
					yield {
						type: 'message_end' as const,
						stopReason: 'end_turn',
						usage: { inputTokens: 1, outputTokens: 1 },
					};
				},
			}),
			toolsFactory: () => [
				makeAgentTool('read', 'Read files'),
				makeAgentTool('write', 'Write files'),
				makeAgentTool('find', 'Find files'),
				makeAgentTool('gmail_get_recent_emails', 'Gmail: Get recent emails.'),
				makeAgentTool('web_fetch', 'Fetch web pages.'),
			],
		});

		await expect(
			service.send('What tools do you have?', 'main', {
				toolsAllow: ['read', 'write', 'gmail_*'],
			})
		).resolves.toBe('allowed tools');
		expect(requests[0]!.tools.map((tool) => tool.name)).toEqual([
			'read',
			'write',
			'gmail_get_recent_emails',
		]);
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('applies group allowlists to the default canonical tool assembly', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () => ({
				async *stream(req) {
					requests.push(req);
					yield { type: 'text_delta' as const, text: 'file tools only' };
					yield {
						type: 'message_end' as const,
						stopReason: 'end_turn',
						usage: { inputTokens: 1, outputTokens: 1 },
					};
				},
			}),
		});

		await expect(
			service.send('What file tools can you use?', 'main', {
				toolsAllow: ['group:file'],
			})
		).resolves.toBe('file tools only');
		const toolNames = requests[0]!.tools.map((tool) => tool.name);
		expect(toolNames).toContain('read');
		expect(toolNames).not.toEqual(expect.arrayContaining(['exec', 'process', 'web_fetch']));
		expect(
			toolNames.every((name) =>
				[
					'read',
					'write',
					'edit',
					'apply_patch',
					'delete',
					'copy',
					'move',
					'inspect_file',
					'find',
				].includes(name)
			)
		).toBe(true);
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('exposes connected Google connector tools for Gmail profile requests', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const gmailProfileTool: AgentTool = {
			name: 'my_gmail_get_profile',
			description: 'My Gmail: Get the connected Gmail profile.',
			schema: { type: 'object', properties: {}, additionalProperties: false },
			execute: jest.fn(),
		};
		const connectors = {
			createAgentTools: jest.fn(() => [gmailProfileTool]),
		};
		const service = new AgentService(
			{ ...deps, connectors: connectors as never },
			{
				sessionBaseDir,
				runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
				providerFactory: () => ({
					async *stream(req) {
						requests.push(req);
						yield { type: 'text_delta' as const, text: 'profile ready' };
						yield {
							type: 'message_end' as const,
							stopReason: 'end_turn',
							usage: { inputTokens: 1, outputTokens: 1 },
						};
					},
				}),
			}
		);

		await expect(service.send('get my gmail profile')).resolves.toBe('profile ready');
		expect(connectors.createAgentTools).toHaveBeenCalled();
		expect(requests[0]!.tools.map((tool) => tool.name)).toContain('my_gmail_get_profile');
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('passes real connector tools through provider-neutral model overrides', async () => {
		const sessionBaseDir = await makeTempDir();
		const runLogDir = await makeTempDir();
		const deps = makeDeps();
		deps.store.getProviderById.mockImplementation((id: string) => {
			if (id === 'anthropic') {
				return {
					id: 'anthropic',
					name: 'Anthropic',
					apiKey: 'sk-ant-test',
					baseUrl: 'https://api.anthropic.com',
				};
			}
			return {
				id: 'openai',
				name: 'OpenAI',
				apiKey: 'sk-test',
				baseUrl: 'https://api.openai.com/v1',
			};
		});
		let connectorRecords: unknown[] = [];
		const connectorStore = {
			getConnectors: jest.fn(() => connectorRecords),
			setConnectors: jest.fn((next: unknown[]) => { connectorRecords = next; }),
		};
		const connectors = new ConnectorsService(connectorStore as never, makeLogger() as never);
		await connectors.add({
			name: 'My Gmail',
			connectorId: 'connector_gmail',
			authorization: 'google-token',
			allowedTools: ['get_profile'],
		});
		const requests: ProviderStreamRequest[] = [];
		const providerFactory = jest.fn(() => ({
			async *stream(req) {
				requests.push(req);
				yield { type: 'text_delta' as const, text: 'profile ready' };
				yield {
					type: 'message_end' as const,
					stopReason: 'end_turn',
					usage: { inputTokens: 1, outputTokens: 1 },
				};
			},
		}));
		const service = new AgentService(
			{ ...deps, connectors },
			{
				sessionBaseDir,
				runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: runLogDir }),
				providerFactory,
			}
		);

		await expect(
			service.send('get my gmail profile', 'main', {
				providerId: 'anthropic',
				model: 'claude-test',
			})
		).resolves.toBe('profile ready');
		expect(providerFactory).toHaveBeenCalledWith({
			id: 'anthropic',
			apiKey: 'sk-ant-test',
			baseURL: 'https://api.anthropic.com',
		});
		expect(requests[0]).toMatchObject({ model: 'claude-test' });
		expect(requests[0]!.tools).toEqual(expect.arrayContaining([
			expect.objectContaining({
				name: 'my_gmail_get_profile',
				schema: expect.objectContaining({ type: 'object' }),
			}),
		]));
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
		await fs.rm(runLogDir, { recursive: true, force: true });
	});

	it('defaults to outside-readable local tools for file-backed requests', async () => {
		const workspace = await makeTempDir();
		const outside = await makeTempDir();
		const sessionBaseDir = await makeTempDir();
		const outsideFile = path.join(outside, 'outside.txt');
		await fs.writeFile(outsideFile, 'outside readable', 'utf8');
		const deps = makeDeps(workspace);
		const requests: ProviderStreamRequest[] = [];
		let turn = 0;
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () => ({
				async *stream(req) {
					requests.push(req);
					if (turn++ === 0) {
						yield { type: 'tool_call_start' as const, id: 'read-outside', name: 'read' };
						yield {
							type: 'tool_call_args_delta' as const,
							id: 'read-outside',
							jsonDelta: JSON.stringify({ path: outsideFile }),
						};
						yield { type: 'tool_call_end' as const, id: 'read-outside' };
						yield {
							type: 'message_end' as const,
							stopReason: 'tool_use',
							usage: { inputTokens: 1, outputTokens: 1 },
						};
						return;
					}
					yield { type: 'text_delta' as const, text: 'read complete' };
					yield {
						type: 'message_end' as const,
						stopReason: 'end_turn',
						usage: { inputTokens: 1, outputTokens: 1 },
					};
				},
			}),
		});

		await expect(service.send(`read ${outsideFile}`)).resolves.toBe('read complete');
		const toolNames = requests[0]!.tools.map((tool) => tool.name);
		expect(toolNames).toContain('read');
		const history = await service.getHistory();
		expect(JSON.stringify(history)).toContain(outsideFile);
		expect(JSON.stringify(history)).toContain('outside readable');
		await fs.rm(workspace, { recursive: true, force: true });
		await fs.rm(outside, { recursive: true, force: true });
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('exposes local file mutation, inspection, patch, and shell tools by default', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () => ({
				async *stream(req) {
					requests.push(req);
					yield { type: 'text_delta' as const, text: 'tool inventory ready' };
					yield {
						type: 'message_end' as const,
						stopReason: 'end_turn',
						usage: { inputTokens: 1, outputTokens: 1 },
					};
				},
			}),
		});

		await expect(service.send('Do you have any internal tools?')).resolves.toBe('tool inventory ready');
		const toolNames = requests[0]!.tools.map((tool) => tool.name);
		expect(toolNames).toEqual(
			expect.arrayContaining([
				'read',
				'write',
				'edit',
				'apply_patch',
				'delete',
				'copy',
				'move',
				'inspect_file',
				'find',
				'exec',
				'process',
			])
		);
		expect(toolNames).not.toContain('startup_files');
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('adds agent startup context and startup_files for full bootstrap turns', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps('/workspace');
		(deps.startupFiles.isBootstrapPending as jest.Mock).mockResolvedValue(true);
		(deps.startupFiles.loadContextFiles as jest.Mock).mockResolvedValue([
			{
				name: 'AGENTS.md',
				path: '/workspace/agent/workspaces/main/AGENTS.md',
				content: 'rules',
				missing: false,
			},
			{
				name: 'BOOTSTRAP.md',
				path: '/workspace/agent/workspaces/main/BOOTSTRAP.md',
				content: 'bootstrap ritual',
				missing: false,
			},
		]);
		const requests: ProviderStreamRequest[] = [];
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () => ({
				async *stream(req) {
					requests.push(req);
					yield { type: 'text_delta' as const, text: 'bootstrap ready' };
					yield {
						type: 'message_end' as const,
						stopReason: 'end_turn',
						usage: { inputTokens: 1, outputTokens: 1 },
					};
				},
			}),
		});

		await expect(service.send('hi')).resolves.toBe('bootstrap ready');
		expect(requests[0]!.tools.map((tool) => tool.name)).toEqual(['startup_files']);
		expect(requests[0]!.system).toContain('## Bootstrap');
		expect(requests[0]!.system).toContain('bootstrap ritual');
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('strips BOOTSTRAP.md from secondary session context', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps('/workspace');
		(deps.startupFiles.isBootstrapPending as jest.Mock).mockResolvedValue(true);
		(deps.startupFiles.loadContextFiles as jest.Mock).mockResolvedValue([
			{
				name: 'AGENTS.md',
				path: '/workspace/agent/workspaces/main/AGENTS.md',
				content: 'rules',
				missing: false,
			},
			{
				name: 'MEMORY.md',
				path: '/workspace/agent/workspaces/main/MEMORY.md',
				content: 'memory',
				missing: false,
			},
			{
				name: 'BOOTSTRAP.md',
				path: '/workspace/agent/workspaces/main/BOOTSTRAP.md',
				content: 'bootstrap ritual',
				missing: false,
			},
		]);
		const requests: ProviderStreamRequest[] = [];
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () => ({
				async *stream(req) {
					requests.push(req);
					yield { type: 'text_delta' as const, text: 'subagent ready' };
					yield {
						type: 'message_end' as const,
						stopReason: 'end_turn',
						usage: { inputTokens: 1, outputTokens: 1 },
					};
				},
			}),
		});

		await expect(service.send('read a file', 'worker')).resolves.toBe('subagent ready');
		expect(requests[0]!.system).toContain('rules');
		expect(requests[0]!.system).not.toContain('bootstrap ritual');
		expect(requests[0]!.system).not.toContain('memory');
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('exposes read with move for file relocation requests', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () => ({
				async *stream(req) {
					requests.push(req);
					yield { type: 'text_delta' as const, text: 'ready' };
					yield {
						type: 'message_end' as const,
						stopReason: 'end_turn',
						usage: { inputTokens: 1, outputTokens: 1 },
					};
				},
			}),
		});

		await expect(service.send('Move the file from one directory to another.')).resolves.toBe('ready');
		const toolNames = requests[0]!.tools.map((tool) => tool.name);
		expect(toolNames).toEqual(expect.arrayContaining(['read', 'move']));
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('exposes exec for plain Python script run requests', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () => ({
				async *stream(req) {
					requests.push(req);
					yield { type: 'text_delta' as const, text: 'ready' };
					yield {
						type: 'message_end' as const,
						stopReason: 'end_turn',
						usage: { inputTokens: 1, outputTokens: 1 },
					};
				},
			}),
		});

		await expect(service.send('Run the Python script.')).resolves.toBe('ready');
		expect(requests[0]!.tools.map((tool) => tool.name)).toContain('exec');
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
			providerFactory: () =>
				providerTurns([
					[
						{ type: 'tool_call_start', id: 'tc1', name: 'needs_approval' },
						{ type: 'tool_call_args_delta', id: 'tc1', jsonDelta: '{"ok":true}' },
						{ type: 'tool_call_end', id: 'tc1' },
						{
							type: 'message_end',
							stopReason: 'tool_use',
							usage: { inputTokens: 1, outputTokens: 1 },
						},
					],
					[
						{ type: 'text_delta', text: 'finished' },
						{
							type: 'message_end',
							stopReason: 'end_turn',
							usage: { inputTokens: 1, outputTokens: 1 },
						},
					],
				]),
			toolsFactory: () => [tool],
		});

		const send = service.send('execute the needs_approval tool');
		await expect(send).resolves.toBe('finished');
		expect(execute).toHaveBeenCalledWith({ ok: true }, expect.any(Object));
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
			providerFactory: () =>
				providerTurns([
					[
						{ type: 'tool_call_start', id: 'tc1', name: 'ping' },
						{ type: 'tool_call_args_delta', id: 'tc1', jsonDelta: '{"value":1}' },
						{ type: 'tool_call_end', id: 'tc1' },
						{
							type: 'message_end',
							stopReason: 'tool_use',
							usage: { inputTokens: 1, outputTokens: 1 },
						},
					],
					[
						{ type: 'text_delta', text: 'finished' },
						{
							type: 'message_end',
							stopReason: 'end_turn',
							usage: { inputTokens: 1, outputTokens: 1 },
						},
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

	it('adds compact skill guidance and execute_skill tool for executable skills', async () => {
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
		expect(requests[0]!.system).toContain('## Skills');
		expect(requests[0]!.system).toContain('summarize-document@1.0.0');
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('passes skill connectors through discovery and execute_skill setup', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const skillConnector = {
			id: 'connector_gmail',
			name: 'Gmail',
			tools: new Set(['search_emails']),
			call: jest.fn(),
		};
		const skillChoice: SkillPromptChoice = {
			id: 'gmail-summary',
			version: '1.0.0',
			name: 'gmail-summary',
			description: 'Summarize Gmail messages through a scoped connector.',
			category: 'communication',
			tags: [],
			requiredTools: [],
			requiredConnectors: ['connector_gmail'],
			permissionsRequired: [],
			safetyLevel: 'low',
			score: 0.95,
		};
		const skills = {
			discoverForPrompt: jest.fn(async () => [skillChoice]),
			createExecutionTool: jest.fn(() => ({
				name: 'execute_skill',
				description: 'Execute skill',
				schema: { type: 'object', properties: {}, additionalProperties: false },
				execute: jest.fn(),
			})),
		};
		const connectors = {
			createSkillConnectors: jest.fn(() => [skillConnector]),
		};
		const service = new AgentService(
			{
				...deps,
				connectors: connectors as never,
				skills: skills as unknown as SkillsService,
			},
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

		await expect(service.send('Use the Gmail summary skill')).resolves.toBe('done');
		expect(connectors.createSkillConnectors).toHaveBeenCalled();
		expect(skills.discoverForPrompt.mock.calls[0]![1]).toMatchObject({
			connectors: [skillConnector],
		});
		expect(skills.createExecutionTool).toHaveBeenCalledWith(
			expect.objectContaining({
				connectors: [skillConnector],
			})
		);
		expect(requests[0]!.tools.map((tool) => tool.name)).toContain('execute_skill');
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('uses read-on-demand guidance for file-backed skills without execute_skill', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const readTool: AgentTool = {
			name: 'read',
			description: 'Read files',
			schema: {
				type: 'object',
				properties: { path: { type: 'string' } },
				required: ['path'],
				additionalProperties: false,
			},
			execute: jest.fn(),
		};
		const skillChoice: SkillPromptChoice = {
			id: 'research-brief',
			version: '1.0.0',
			name: 'research-brief',
			description: 'Create concise research briefs from local documents.',
			path: '/workspace/skills/research-brief/SKILL.md',
			category: 'research',
			tags: [],
			requiredTools: [],
			allowedTools: ['write'],
			requiredConnectors: [],
			permissionsRequired: [],
			safetyLevel: 'low',
			score: 0.95,
		};
		const skills = {
			discoverForPrompt: jest.fn(async () => [skillChoice]),
			createExecutionTool: jest.fn(() => ({
				name: 'execute_skill',
				description: 'Execute skill',
				schema: { type: 'object', properties: {}, additionalProperties: false },
				execute: jest.fn(),
			})),
		};
		const service = new AgentService(
			{ ...deps, skills: skills as unknown as SkillsService },
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
				toolsFactory: () => [
					readTool,
					{
						name: 'write',
						description: 'Write files',
						schema: {
							type: 'object',
							properties: { path: { type: 'string' }, content: { type: 'string' } },
							required: ['path', 'content'],
							additionalProperties: false,
						},
						execute: jest.fn(),
					},
				],
			}
		);

		await expect(service.send('Use the research-brief skill')).resolves.toBe('done');
		expect(requests[0]!.tools.map((tool) => tool.name)).toEqual(
			expect.arrayContaining(['read', 'write'])
		);
		expect(requests[0]!.tools.map((tool) => tool.name)).not.toContain('execute_skill');
		expect(skills.createExecutionTool).not.toHaveBeenCalled();
		expect(requests[0]!.system).toContain('read its SKILL.md at the exact <location> with `read`');
		expect(requests[0]!.system).toContain('<location>/workspace/skills/research-brief/SKILL.md</location>');
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('resets persisted session and cancels pending requests', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const service = new AgentService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: sessionBaseDir }),
			providerFactory: () =>
				provider([
					{ type: 'message_start' },
					{ type: 'text_delta', text: 'ok' },
					{
						type: 'message_end',
						stopReason: 'end_turn',
						usage: { inputTokens: 1, outputTokens: 1 },
					},
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
