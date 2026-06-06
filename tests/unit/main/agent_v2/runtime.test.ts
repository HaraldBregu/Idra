import { AgentRuntime } from '../../../../src/main/agent_v2/runtime';
import type { ModelModule } from '../../../../src/main/agent_v2/model/types';

describe('AgentRuntime', () => {
	it('uses the agent_v2 model module stream shape', async () => {
		const provider = { id: 'openai', apiKey: 'key' };
		const runTool = jest.fn().mockResolvedValue({ sent: true });
		const stream = jest.fn<ModelModule['stream']>(async function* () {
			yield { type: 'model_call_start', model: 'gpt-5' };
			yield { type: 'model_call_delta', delta: 'Done ' };
			yield {
				type: 'model_call_delta',
				delta: '{"toolCalls":[{"name":"notify","args":{"ok":true}}]}',
			};
			yield { type: 'model_call_end', model: 'gpt-5', stopReason: 'end_turn' };
		});
		const runtime = new AgentRuntime({
			generate: jest.fn<ModelModule['generate']>(),
			stream,
		});

		const run = runtime.run({
			task: 'notify',
			message: 'Send the update.',
			provider,
			modelRoutes: [{ task: 'notify', model: 'gpt-5' }],
			tools: [{ name: 'notify', description: 'Send a notification.', run: runTool }],
			system: 'Be direct.',
			maxTokens: 512,
		});
		const events = [];

		for await (const event of run.stream) {
			events.push(event);
		}

		expect(stream).toHaveBeenCalledWith({
			provider,
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
			maxTokens: 512,
			signal: expect.any(AbortSignal),
		});
		expect(runTool).toHaveBeenCalledWith({ ok: true });
		expect(events).toEqual([
			{ type: 'model_call_start', model: 'gpt-5' },
			{ type: 'model_call_delta', delta: 'Done ' },
			{
				type: 'model_call_delta',
				delta: '{"toolCalls":[{"name":"notify","args":{"ok":true}}]}',
			},
			{ type: 'model_call_end', model: 'gpt-5', stopReason: 'end_turn' },
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
		const stream = jest.fn<ModelModule['stream']>(async function* () {
			yield { type: 'model_call_start', model: 'gpt-5' };
			yield { type: 'model_call_delta', delta: 'Hello' };
		});
		const runtime = new AgentRuntime({
			generate: jest.fn<ModelModule['generate']>(),
			stream,
		});
		const run = runtime.run({
			task: 'default',
			message: 'Hello.',
			provider: { id: 'openai', apiKey: 'key' },
			model: 'gpt-5',
		});

		run.stop('timeout');

		const events = [];
		for await (const event of run.stream) {
			events.push(event);
		}

		expect(events).toEqual([{ type: 'run_stopped', reason: 'timeout' }]);
	});
});
