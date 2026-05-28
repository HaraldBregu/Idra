import { ContextOverflowError, type ProviderAdapter, type ProviderEvent } from '../../../../src/main/provider/types';
import { runAgent } from '../../../../src/main/agent/run';
import type { AgentTool } from '../../../../src/main/tools/types';
import type { SessionFile } from '../../../../src/main/session/store';
import { makeToolContext } from '../test-helpers';

function session(): SessionFile {
	return {
		id: 's1',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		model: 'gpt-test',
		provider: 'openai',
		transcript: [],
		plan: [],
		compactionMarkers: [],
	};
}

function provider(turns: Array<ProviderEvent[] | Error>): ProviderAdapter {
	let index = 0;
	return {
		async *stream() {
			const turn = turns[index++]!;
			if (turn instanceof Error) throw turn;
			for (const event of turn) yield event;
		},
	};
}

const end = (usage = { inputTokens: 1, outputTokens: 1 }): ProviderEvent => ({
	type: 'message_end',
	stopReason: 'end_turn',
	usage,
});

describe('agent/run', () => {
	it('streams text, appends transcript entries, and returns usage', async () => {
		const chunks: string[] = [];
		const result = await runAgent({
			runId: 'r1',
			userMessage: 'hello',
			systemPrompt: 'sys',
			session: session(),
			provider: provider([[{ type: 'message_start' }, { type: 'text_delta', text: 'hi' }, end()]]),
			model: 'gpt-test',
			tools: [],
			ctx: makeToolContext(),
			streamOutput: (chunk) => chunks.push(chunk),
		});

		expect(result.finalText).toBe('hi');
		expect(chunks).toEqual(['hi']);
		expect(result.usage).toEqual({ inputTokens: 1, outputTokens: 1 });
		expect(result.session.transcript.map((entry) => entry.role)).toEqual(['user', 'assistant']);
	});

	it('executes tool calls and feeds tool results into the next model turn', async () => {
		const requests: Array<unknown> = [];
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

		const result = await runAgent({
			runId: 'r1',
			userMessage: 'do it',
			systemPrompt: 'sys',
			session: session(),
			provider: {
				async *stream(req) {
					requests.push([...req.messages]);
					if (requests.length === 1) {
						yield { type: 'tool_call_start' as const, id: 'tc1', name: 'ping' };
						yield {
							type: 'tool_call_args_delta' as const,
							id: 'tc1',
							jsonDelta: '{"value":1}',
						};
						yield { type: 'tool_call_end' as const, id: 'tc1' };
						yield end();
						return;
					}
					yield { type: 'text_delta' as const, text: 'done' };
					yield end();
				},
			},
			model: 'gpt-test',
			tools: [tool],
			ctx: makeToolContext(),
		});

		expect(execute).toHaveBeenCalledWith({ value: 1 }, expect.any(Object));
		expect(result.toolCalls).toBe(1);
		expect(result.finalText).toBe('done');
		expect(result.session.transcript.map((entry) => entry.role)).toEqual([
			'user',
			'assistant',
			'tool',
			'assistant',
		]);
		expect(result.session.transcript[1]).toEqual({
			role: 'assistant',
			content: [
				{
					type: 'tool_use',
					toolUseId: 'tc1',
					toolName: 'ping',
					toolArgs: { value: 1 },
				},
			],
		});
		expect(result.session.transcript[2]).toEqual({
			role: 'tool',
			toolUseId: 'tc1',
			isError: false,
			status: 'ok',
			content: [{ type: 'text', text: 'pong' }],
		});
		expect(requests[1]).toEqual([
			{ role: 'user', content: 'do it' },
			{
				role: 'assistant',
				content: [
					{
						type: 'tool_use',
						toolUseId: 'tc1',
						toolName: 'ping',
						toolArgs: { value: 1 },
					},
				],
			},
			{
				role: 'tool',
				toolUseId: 'tc1',
				isError: false,
				status: 'ok',
				content: [{ type: 'text', text: 'pong' }],
			},
		]);
	});

	it('rejects malformed tool arguments without executing the tool', async () => {
		const execute = jest.fn(async () => ({
			status: 'ok' as const,
			content: [{ type: 'text' as const, text: 'should not run' }],
		}));
		const tool: AgentTool = {
			name: 'ping',
			description: 'Ping',
			schema: { type: 'object' },
			execute,
		};

		const result = await runAgent({
			runId: 'r1',
			userMessage: 'do it',
			systemPrompt: 'sys',
			session: session(),
			provider: provider([
				[
					{ type: 'tool_call_start', id: 'tc1', name: 'ping' },
					{ type: 'tool_call_args_delta', id: 'tc1', jsonDelta: '{"value":' },
					{ type: 'tool_call_end', id: 'tc1' },
					end(),
				],
				[{ type: 'text_delta', text: 'recovered' }, end()],
			]),
			model: 'gpt-test',
			tools: [tool],
			ctx: makeToolContext(),
		});

		expect(execute).not.toHaveBeenCalled();
		expect(result.toolCalls).toBe(1);
		expect(result.finalText).toBe('recovered');
		expect(result.session.transcript[1]).toEqual({
			role: 'assistant',
			content: [
				{
					type: 'tool_use',
					toolUseId: 'tc1',
					toolName: 'ping',
					toolArgs: { __unparsed: '{"value":' },
				},
			],
		});
		expect(result.session.transcript[2]).toEqual({
			role: 'tool',
			toolUseId: 'tc1',
			isError: true,
			status: 'error',
			content: [expect.objectContaining({ type: 'text', text: expect.stringContaining('Invalid JSON arguments') })],
		});
	});

	it('stores multiple tool calls and auto-allowed legacy approval tools with stable call ids', async () => {
		const events: ProviderEvent[] = [];
		const safeTool: AgentTool = {
			name: 'safe_tool',
			description: 'Safe',
			schema: { type: 'object' },
			execute: jest.fn(async () => ({
				status: 'ok' as const,
				content: [{ type: 'text' as const, text: 'safe ok' }],
			})),
		};
		const approvalTool: AgentTool = {
			name: 'approval_tool',
			description: 'Approval',
			schema: { type: 'object' },
			needsApproval: true,
			execute: jest.fn(async () => ({
				status: 'ok' as const,
				content: [{ type: 'text' as const, text: 'should not run' }],
			})),
		};

		const result = await runAgent({
			runId: 'r1',
			userMessage: 'use tools',
			systemPrompt: 'sys',
			session: session(),
			provider: provider([
				[
					{ type: 'tool_call_start', id: 'tc-ok', name: 'safe_tool' },
					{ type: 'tool_call_args_delta', id: 'tc-ok', jsonDelta: '{"a":1}' },
					{ type: 'tool_call_end', id: 'tc-ok' },
					{ type: 'tool_call_start', id: 'tc-denied', name: 'approval_tool' },
					{ type: 'tool_call_args_delta', id: 'tc-denied', jsonDelta: '{"b":2}' },
					{ type: 'tool_call_end', id: 'tc-denied' },
					end(),
				],
				[{ type: 'text_delta', text: 'done' }, end()],
			]),
			model: 'gpt-test',
			tools: [safeTool, approvalTool],
			ctx: makeToolContext(),
			streamEvent: (event) => events.push(event as ProviderEvent),
		});

		expect(result.session.transcript).toEqual([
			{ role: 'user', content: 'use tools' },
			{
				role: 'assistant',
				content: [
					{
						type: 'tool_use',
						toolUseId: 'tc-ok',
						toolName: 'safe_tool',
						toolArgs: { a: 1 },
					},
					{
						type: 'tool_use',
						toolUseId: 'tc-denied',
						toolName: 'approval_tool',
						toolArgs: { b: 2 },
					},
				],
			},
			{
				role: 'tool',
				toolUseId: 'tc-ok',
				isError: false,
				status: 'ok',
				content: [{ type: 'text', text: 'safe ok' }],
			},
				{
					role: 'tool',
					toolUseId: 'tc-denied',
					isError: false,
					status: 'ok',
					content: [{ type: 'text', text: 'should not run' }],
				},
			{ role: 'assistant', content: [{ type: 'text', text: 'done' }] },
		]);
		expect(events).toContainEqual(
			expect.objectContaining({
					type: 'tool_call_result',
					toolCallId: 'tc-denied',
					status: 'ok',
					outputText: 'should not run',
				})
			);
	});

	it('compacts once on context overflow and retries', async () => {
		const existing = session();
		existing.transcript = Array.from({ length: 9 }, (_, i) => ({ role: 'user' as const, content: `old ${i}` }));
		const result = await runAgent({
			runId: 'r1',
			userMessage: 'new',
			systemPrompt: 'sys',
			session: existing,
			provider: provider([
				new ContextOverflowError('too long'),
				[{ type: 'text_delta', text: 'summary' }, end()],
				[{ type: 'text_delta', text: 'ok' }, end()],
			]),
			model: 'gpt-test',
			tools: [],
			ctx: makeToolContext(),
		});

		expect(result.finalText).toBe('ok');
		expect(result.session.compactionMarkers).toHaveLength(1);
		expect(result.session.transcript[0]).toMatchObject({ role: 'user' });
	});
});
