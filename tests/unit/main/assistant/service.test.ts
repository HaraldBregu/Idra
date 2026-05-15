import { promises as fs } from 'node:fs';
import type { ProviderAdapter, ProviderEvent, ProviderStreamRequest } from '../../../../src/main/provider/types';
import { AssistantService } from '../../../../src/main/service';
import { AssistantRunLogger } from '../../../../src/main/run-logger';
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
		getAssistantService: jest.fn(() => ({
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
		workspace: { getRootPath: jest.fn(() => '/workspace') } as never,
	};
}

describe('AssistantService', () => {
	it('drives the new agent loop directly from the IPC-facing service', async () => {
		const sessionBaseDir = await makeTempDir();
		const runLogDir = await makeTempDir();
		const deps = makeDeps();
		const service = new AssistantService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AssistantRunLogger(id, { baseDir: runLogDir }),
			providerFactory: jest.fn(() => provider([
				{ type: 'message_start' },
				{ type: 'text_delta', text: 'hello' },
				{ type: 'message_end', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 2 } },
			])),
			toolsFactory: () => [],
		});

		await expect(service.send('hi')).resolves.toBe('hello');
		expect(deps.eventBus.broadcast).toHaveBeenCalledWith('assistant:response', expect.objectContaining({ delta: 'hello' }));
		await expect(service.getHistory()).resolves.toEqual(expect.arrayContaining([
			expect.objectContaining({ role: 'user', content: 'hi' }),
			expect.objectContaining({ role: 'assistant' }),
		]));

		const records = await new AssistantRunLogger('main', { baseDir: runLogDir }).readAll();
		expect(records.map((record) => record.event)).toEqual(expect.arrayContaining(['start', 'finish']));
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
		await fs.rm(runLogDir, { recursive: true, force: true });
	});

	it('uses HITL approval over IPC pending state before executing tools', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const execute = jest.fn(async () => ({
			status: 'ok' as const,
			content: [{ type: 'text' as const, text: 'tool done' }],
		}));
		const tool: AgentTool = {
			name: 'needs_approval',
			description: 'Needs approval',
			schema: { type: 'object' },
			needsApproval: true,
			execute,
		};
		const service = new AssistantService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AssistantRunLogger(id, { baseDir: sessionBaseDir }),
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

		const send = service.send('do it');
		let pending = service.getPending();
		for (let i = 0; i < 10 && pending.approvals.length === 0; i++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
			pending = service.getPending();
		}
		expect(pending.approvals).toHaveLength(1);
		expect(service.resolveApproval(pending.approvals[0]!.id, true)).toBe(true);
		await expect(send).resolves.toBe('finished');
		expect(execute).toHaveBeenCalledWith({ ok: true }, expect.any(Object));
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('adds compact skill guidance and execute_skill tool when skills are available', async () => {
		const sessionBaseDir = await makeTempDir();
		const deps = makeDeps();
		const requests: ProviderStreamRequest[] = [];
		const skills = new SkillsService(deps.logger as never);
		const service = new AssistantService(
			{ ...deps, skills },
			{
				sessionBaseDir,
				runLoggerFactory: (id) => new AssistantRunLogger(id, { baseDir: sessionBaseDir }),
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
		const service = new AssistantService(deps, {
			sessionBaseDir,
			runLoggerFactory: (id) => new AssistantRunLogger(id, { baseDir: sessionBaseDir }),
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
