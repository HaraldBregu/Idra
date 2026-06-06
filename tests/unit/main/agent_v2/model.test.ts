const mockStream = jest.fn();
const mockBuild = jest.fn(() => ({ stream: mockStream }));

jest.mock('../../../../src/main/llm', () => ({
	LlmService: jest.fn(() => ({
		build: mockBuild,
	})),
}));

import { AgentModel } from '../../../../src/main/agent_v2/model';

async function* streamResponse(): AsyncIterable<unknown> {
	yield { type: 'message_start' };
	yield { type: 'text_delta', text: 'Hello' };
	yield { type: 'text_delta', text: ' world' };
	yield {
		type: 'message_end',
		stopReason: 'end_turn',
		usage: { inputTokens: 3, outputTokens: 2 },
	};
}

describe('AgentModel', () => {
	beforeEach(() => {
		mockStream.mockReturnValue(streamResponse());
	});

	it('uses the documented package import and simple request shape', async () => {
		const provider = { id: 'openai', apiKey: 'key', baseURL: 'https://api.example.test' };
		const signal = new AbortController().signal;
		const model = new AgentModel();

		const response = await model.generate({
			provider,
			model: 'gpt-5',
			maxTokens: 1024,
			system: 'Answer clearly.',
			messages: [
				{ role: 'system', content: 'Use short sentences.' },
				{ role: 'user', content: 'Summarize the current task.' },
				{ role: 'assistant', content: 'Working on it.' },
				{ role: 'tool', toolUseId: 'tool-1', content: 'Tool result.' },
			],
			signal,
		});

		expect(mockBuild).toHaveBeenCalledWith(provider);
		expect(mockStream).toHaveBeenCalledWith({
			model: 'gpt-5',
			system: 'Answer clearly.\n\nUse short sentences.',
			messages: [
				{ role: 'user', content: 'Summarize the current task.' },
				{ role: 'assistant', content: [{ type: 'text', text: 'Working on it.' }] },
				{
					role: 'tool',
					toolUseId: 'tool-1',
					content: [{ type: 'text', text: 'Tool result.' }],
				},
			],
			tools: [],
			maxTokens: 1024,
			signal,
		});
		expect(response).toEqual({
			content: 'Hello world',
			model: 'gpt-5',
			stopReason: 'end_turn',
			usage: { inputTokens: 3, outputTokens: 2 },
		});
	});

	it('streams model events without exposing llm provider events', async () => {
		const model = new AgentModel();
		const events = [];

		for await (const event of model.stream({
			provider: { id: 'openai', apiKey: 'key' },
			model: 'gpt-5',
			maxTokens: 1024,
			messages: [{ role: 'user', content: 'Hello.' }],
		})) {
			events.push(event);
		}

		expect(events).toEqual([
			{ type: 'model_call_start', model: 'gpt-5' },
			{ type: 'model_call_delta', delta: 'Hello' },
			{ type: 'model_call_delta', delta: ' world' },
			{
				type: 'model_call_end',
				model: 'gpt-5',
				stopReason: 'end_turn',
				usage: { inputTokens: 3, outputTokens: 2 },
			},
		]);
	});
});
