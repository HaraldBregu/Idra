const mockStream = jest.fn();
const mockBuild = jest.fn(() => ({ stream: mockStream }));

jest.mock('../../../../src/main/llm', () => ({
	LlmService: jest.fn(() => ({
		build: mockBuild,
	})),
}));

import { Agent } from '../../../../src/main/agent_v2';

async function* streamResponse(): AsyncIterable<unknown> {
	yield { type: 'message_start' };
	yield { type: 'text_delta', text: 'Done ' };
	yield {
		type: 'text_delta',
		text: '{"toolCalls":[{"name":"notify","args":{"ok":true}}]}',
	};
	yield {
		type: 'message_end',
		stopReason: 'end_turn',
		usage: { inputTokens: 3, outputTokens: 2 },
	};
}

describe('Agent', () => {
	beforeEach(() => {
		mockStream.mockReturnValue(streamResponse());
	});

	it('runs through the public Agent export', async () => {
		const provider = { id: 'openai', apiKey: 'key', baseURL: 'https://api.example.test' };
		const tool = jest.fn().mockResolvedValue({ sent: true });
		const agent = new Agent({
			provider,
			model: 'gpt-5',
			system: 'Be direct.',
			maxTokens: 512,
			tools: [{ name: 'notify', description: 'Send a notification.', run: tool }],
		});

		const run = agent.run('Send the update.');
		const events = [];

		for await (const event of run.stream) {
			events.push(event);
		}

		expect(mockBuild).toHaveBeenCalledWith(provider);
		expect(mockStream).toHaveBeenCalledWith({
			model: 'gpt-5',
			system: 'Be direct.',
			messages: [
				{
					role: 'user',
					content: [
						'Available tools:',
						'- notify: Send a notification.',
						'When a tool is needed, output tool calls as JSON: {"toolCalls":[{"name":"tool","args":{}}]}',
						'',
						'Send the update.',
					].join('\n'),
				},
			],
			tools: [],
			maxTokens: 512,
			signal: expect.any(AbortSignal),
		});
		expect(tool).toHaveBeenCalledWith({ ok: true });
		expect(events).toEqual([
			{ type: 'model_call_start', model: 'gpt-5' },
			{ type: 'model_call_delta', delta: 'Done ' },
			{
				type: 'model_call_delta',
				delta: '{"toolCalls":[{"name":"notify","args":{"ok":true}}]}',
			},
			{
				type: 'model_call_end',
				model: 'gpt-5',
				stopReason: 'end_turn',
				usage: { inputTokens: 3, outputTokens: 2 },
			},
			{ type: 'tool_call_start', toolName: 'notify', input: { ok: true } },
			{ type: 'tool_call_end', toolName: 'notify', output: { sent: true } },
			{
				type: 'run_finished',
				result: {
					text: 'Done',
					toolCalls: [{ name: 'notify', args: { ok: true } }],
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
