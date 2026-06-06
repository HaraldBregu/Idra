import { AgentRuntime } from '../../../../src/main/agent_v2/runtime';
import type { ModelModule } from '../../../../src/main/agent_v2/model/types';

describe('AgentRuntime', () => {
	it('uses the agent_v2 model module request and response shape', async () => {
		const provider = { id: 'openai', apiKey: 'key' };
		const generate = jest.fn<ModelModule['generate']>().mockResolvedValue({
			content: 'Done {"toolCalls":[{"name":"notify","args":{"ok":true}}]}',
			model: 'gpt-5',
			stopReason: 'end_turn',
		});
		const runtime = new AgentRuntime({ generate });

		const output = await runtime.run({
			task: 'notify',
			message: 'Send the update.',
			provider,
			modelRoutes: [{ task: 'notify', model: 'gpt-5' }],
			tools: [{ name: 'notify', description: 'Send a notification.' }],
			system: 'Be direct.',
			maxTokens: 512,
		});

		expect(generate).toHaveBeenCalledWith({
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
			signal: undefined,
		});
		expect(output).toEqual({
			text: 'Done',
			toolCalls: [{ name: 'notify', args: { ok: true } }],
			model: 'gpt-5',
			stopReason: 'end_turn',
		});
	});
});
