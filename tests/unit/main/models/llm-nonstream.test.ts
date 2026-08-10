import { LlmModel } from '../../../../src/main/models/adapters/llm/llm_model';
import type { LlmEvent, LlmRequest } from '../../../../src/main/models/adapters/llm/llm_types';

const request = (providerId: string): LlmRequest => ({
	provider: { id: providerId, apiKey: 'key' },
	model: 'model',
	messages: [{ role: 'user', content: 'hello' }],
	tools: [
		{
			name: 'lookup',
			description: 'Lookup data',
			schema: { type: 'object' },
			risk: 'low',
			effect: 'read',
			timeoutMs: 1_000,
			maxOutputBytes: 1_000,
			parseInput: (value) => value as Record<string, unknown>,
			run: () => undefined,
		},
	],
	maxTokens: 100,
	streaming: false,
});

describe('LlmModel non-streaming transport', () => {
	it('uses a batch OpenAI Responses request and preserves response items', async () => {
		const create = jest.fn().mockResolvedValue({
			id: 'response-1',
			status: 'completed',
			output: [
				{
					type: 'message',
					content: [{ type: 'output_text', text: 'done', annotations: [] }],
				},
				{ type: 'reasoning', id: 'reasoning-1', summary: [], encrypted_content: 'sealed' },
				{
					type: 'function_call',
					id: 'item-1',
					call_id: 'call-1',
					name: 'lookup',
					arguments: '{"id":1}',
				},
			],
			usage: { input_tokens: 3, output_tokens: 2 },
		});
		const model = new LlmModel({
			openAIClientFactory: () => ({ responses: { create } }) as never,
		});
		const events: LlmEvent[] = [];
		for await (const event of model.stream(request('openai'))) events.push(event);

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ stream: false, model: 'model' }),
			expect.objectContaining({ signal: undefined })
		);
		expect(events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'model_call_delta', delta: 'done' }),
				expect.objectContaining({ type: 'model_provider_item', provider: 'openai' }),
				{ type: 'model_tool_call_start', id: 'call-1', name: 'lookup' },
				{ type: 'model_tool_call_args_delta', id: 'call-1', jsonDelta: '{"id":1}' },
				expect.objectContaining({
					type: 'model_call_end',
					stopReason: 'tool_calls',
					usage: { inputTokens: 3, outputTokens: 2 },
				}),
			])
		);
	});

	it('uses Anthropic messages.create and adapts complete tool blocks', async () => {
		const create = jest.fn().mockResolvedValue({
			content: [
				{ type: 'text', text: 'checking' },
				{ type: 'tool_use', id: 'tool-1', name: 'lookup', input: { id: 1 } },
			],
			stop_reason: 'tool_use',
			usage: { input_tokens: 4, output_tokens: 3 },
		});
		const model = new LlmModel({
			anthropicClientFactory: () => ({ messages: { create } }) as never,
		});
		const events: LlmEvent[] = [];
		for await (const event of model.stream(request('anthropic'))) events.push(event);

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ stream: false, model: 'model' }),
			expect.objectContaining({ signal: undefined })
		);
		expect(events).toEqual(
			expect.arrayContaining([
				{ type: 'model_call_delta', delta: 'checking' },
				{ type: 'model_tool_call_start', id: 'tool-1', name: 'lookup' },
				{ type: 'model_tool_call_args_delta', id: 'tool-1', jsonDelta: '{"id":1}' },
				expect.objectContaining({
					type: 'model_call_end',
					stopReason: 'tool_use',
					usage: { inputTokens: 4, outputTokens: 3 },
				}),
			])
		);
	});

	it('uses a batch OpenAI-compatible chat request', async () => {
		const create = jest.fn().mockResolvedValue({
			choices: [
				{
					finish_reason: 'tool_calls',
					message: {
						content: 'checking',
						tool_calls: [
							{
								type: 'function',
								id: 'tool-1',
								function: { name: 'lookup', arguments: '{"id":1}' },
							},
						],
					},
				},
			],
			usage: { prompt_tokens: 5, completion_tokens: 4 },
		});
		const model = new LlmModel({
			openAIClientFactory: () => ({ chat: { completions: { create } } }) as never,
		});
		const events: LlmEvent[] = [];
		for await (const event of model.stream(request('compatible'))) events.push(event);

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ stream: false, stream_options: undefined, model: 'model' }),
			expect.objectContaining({ signal: undefined })
		);
		expect(events).toEqual(
			expect.arrayContaining([
				{ type: 'model_call_delta', delta: 'checking' },
				{ type: 'model_tool_call_start', id: 'tool-1', name: 'lookup' },
				{ type: 'model_tool_call_args_delta', id: 'tool-1', jsonDelta: '{"id":1}' },
				expect.objectContaining({
					type: 'model_call_end',
					stopReason: 'tool_calls',
					usage: { inputTokens: 5, outputTokens: 4 },
				}),
			])
		);
	});
});
