const mockStream = jest.fn();
const mockBuild = jest.fn(() => ({ stream: mockStream }));

jest.mock('../../../../src/main/llm', () => ({
	LlmService: jest.fn(() => ({
		build: mockBuild,
	})),
}));

import { Agent } from '../../../../src/main/agent_v2';

async function* toolCallResponse(): AsyncIterable<unknown> {
	yield { type: 'message_start' };
	yield { type: 'tool_call_start', id: 'call_1', name: 'notify' };
	yield { type: 'tool_call_args_delta', id: 'call_1', jsonDelta: '{"ok":true}' };
	yield { type: 'tool_call_end', id: 'call_1' };
	yield {
		type: 'message_end',
		stopReason: 'tool_calls',
		usage: { inputTokens: 3, outputTokens: 2 },
	};
}

async function* finalResponse(): AsyncIterable<unknown> {
	yield { type: 'message_start' };
	yield { type: 'text_delta', text: 'Done' };
	yield {
		type: 'message_end',
		stopReason: 'end_turn',
		usage: { inputTokens: 4, outputTokens: 1 },
	};
}

describe('Agent', () => {
	beforeEach(() => {
		mockStream.mockReset();
		mockBuild.mockClear();
		mockStream.mockReturnValueOnce(toolCallResponse()).mockReturnValueOnce(finalResponse());
	});

	it('runs through the public Agent export', async () => {
		const provider = { id: 'openai', apiKey: 'key', baseURL: 'https://api.example.test' };
		const tool = jest.fn().mockResolvedValue({ sent: true });
		const agent = new Agent({
			provider,
			model: 'gpt-5',
			system: 'Be direct.',
			maxTokens: 512,
			tools: [
				{
					name: 'notify',
					description: 'Send a notification.',
					schema: {
						type: 'object',
						properties: { ok: { type: 'boolean' } },
						required: ['ok'],
					},
					run: tool,
				},
			],
		});

		const run = agent.run('Send the update.');
		const events = [];

		for await (const event of run.stream) {
			events.push(event);
		}

		expect(mockBuild).toHaveBeenCalledWith(provider);
		expect(mockStream).toHaveBeenNthCalledWith(1, {
			model: 'gpt-5',
			system: 'Be direct.',
			messages: [{ role: 'user', content: 'Send the update.' }],
			tools: [
				{
					name: 'notify',
					description: 'Send a notification.',
					schema: {
						type: 'object',
						properties: { ok: { type: 'boolean' } },
						required: ['ok'],
					},
				},
			],
			maxTokens: 512,
			signal: expect.any(AbortSignal),
		});
		expect(mockStream).toHaveBeenNthCalledWith(2, {
			model: 'gpt-5',
			system: 'Be direct.',
			messages: [
				{ role: 'user', content: 'Send the update.' },
				{
					role: 'assistant',
					content: [
						{
							type: 'tool_use',
							toolUseId: 'call_1',
							toolName: 'notify',
							toolArgs: { ok: true },
						},
					],
				},
				{
					role: 'tool',
					toolUseId: 'call_1',
					content: [{ type: 'text', text: '{"sent":true}' }],
				},
			],
			tools: [
				{
					name: 'notify',
					description: 'Send a notification.',
					schema: {
						type: 'object',
						properties: { ok: { type: 'boolean' } },
						required: ['ok'],
					},
				},
			],
			maxTokens: 512,
			signal: expect.any(AbortSignal),
		});
		expect(tool).toHaveBeenCalledWith({ ok: true });
		expect(events).toEqual([
			{ type: 'model_call_start', model: 'gpt-5' },
			{ type: 'model_tool_call_start', id: 'call_1', name: 'notify' },
			{ type: 'model_tool_call_args_delta', id: 'call_1', jsonDelta: '{"ok":true}' },
			{ type: 'model_tool_call_end', id: 'call_1' },
			{
				type: 'model_call_end',
				model: 'gpt-5',
				stopReason: 'tool_calls',
				usage: { inputTokens: 3, outputTokens: 2 },
			},
			{ type: 'tool_call_start', toolName: 'notify', input: { ok: true } },
			{ type: 'tool_call_end', toolName: 'notify', output: { sent: true } },
			{ type: 'model_call_start', model: 'gpt-5' },
			{ type: 'model_call_delta', delta: 'Done' },
			{
				type: 'model_call_end',
				model: 'gpt-5',
				stopReason: 'end_turn',
				usage: { inputTokens: 4, outputTokens: 1 },
			},
			{
				type: 'run_finished',
				result: {
					text: 'Done',
					toolCalls: [{ id: 'call_1', name: 'notify', args: { ok: true } }],
					model: 'gpt-5',
					stopReason: 'end_turn',
				},
			},
		]);
	});

	it('returns a stoppable run stream', async () => {
		const agent = new Agent({
			provider: { id: 'openai', apiKey: 'key' },
			model: 'gpt-5',
		});
		const run = agent.run('Hello.');

		run.stop('timeout');

		const events = [];
		for await (const event of run.stream) {
			events.push(event);
		}

		expect(events).toEqual([{ type: 'run_stopped', reason: 'timeout' }]);
	});
});
