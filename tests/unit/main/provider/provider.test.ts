import { AnthropicAdapter } from '../../../../src/main/provider/anthropic';
import { OpenAIAdapter } from '../../../../src/main/provider/openai';
import { pickProviderForModel, makeProvider } from '../../../../src/main/provider/factory';
import { ProviderAuthError } from '../../../../src/main/provider/types';
import { collectAsync } from '../test-helpers';

describe('provider/factory', () => {
	it('picks provider kind from model name and rejects missing auth', () => {
		expect(pickProviderForModel('claude-sonnet-4-5')).toBe('anthropic');
		expect(pickProviderForModel('gpt-5')).toBe('openai');
		expect(pickProviderForModel('o4-mini')).toBe('openai');
		expect(() => makeProvider({ id: 'openai', apiKey: '' }, 'gpt-5')).toThrow(ProviderAuthError);
	});
});

describe('provider/openai', () => {
	it('normalizes chat completion stream events', async () => {
		const create = jest.fn(async () => chunks());
		async function* chunks() {
			yield { choices: [{ delta: { content: 'hi ' } }] };
			yield { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call1', function: { name: 'read', arguments: '{"path"' } }] } }] };
			yield { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: ':"a"}' } }] } }] };
			yield { choices: [{ delta: {}, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 2, completion_tokens: 3 } };
		}
		const adapter = new OpenAIAdapter({
			apiKey: 'sk-test',
			clientFactory: () => ({
				chat: { completions: { create } },
			}) as never,
		});

		const events = await collectAsync(adapter.stream({
			model: 'gpt-test',
			system: 'sys',
			messages: [{ role: 'user', content: 'hello' }],
			tools: [{ name: 'read', description: 'Read', schema: { type: 'object' } }],
			maxTokens: 100,
		}));

		expect(events).toEqual([
			{ type: 'message_start' },
			{ type: 'text_delta', text: 'hi ' },
			{ type: 'tool_call_start', id: 'call1', name: 'read' },
			{ type: 'tool_call_args_delta', id: 'call1', jsonDelta: '{"path"' },
			{ type: 'tool_call_args_delta', id: 'call1', jsonDelta: ':"a"}' },
			{ type: 'tool_call_end', id: 'call1' },
			{ type: 'message_end', stopReason: 'tool_calls', usage: { inputTokens: 2, outputTokens: 3 } },
		]);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ max_tokens: 100 }),
			expect.any(Object)
		);
	});

	it('uses max_completion_tokens for GPT-5 chat completion requests', async () => {
		async function* chunks() {
			yield { choices: [{ delta: {}, finish_reason: 'stop' }] };
		}
		const create = jest.fn(async () => chunks());
		const adapter = new OpenAIAdapter({
			apiKey: 'sk-test',
			clientFactory: () => ({
				chat: { completions: { create } },
			}) as never,
		});

		await collectAsync(adapter.stream({
			model: 'gpt-5.5',
			system: 'sys',
			messages: [{ role: 'user', content: 'hello' }],
			tools: [],
			maxTokens: 100,
		}));

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ max_completion_tokens: 100 }),
			expect.any(Object)
		);
		expect(create.mock.calls[0][0]).not.toHaveProperty('max_tokens');
	});

	it('converts prior tool calls and results into OpenAI chat messages', async () => {
		async function* chunks() {
			yield { choices: [{ delta: {}, finish_reason: 'stop' }] };
		}
		const create = jest.fn(async () => chunks());
		const adapter = new OpenAIAdapter({
			apiKey: 'sk-test',
			clientFactory: () => ({
				chat: { completions: { create } },
			}) as never,
		});

		await collectAsync(adapter.stream({
			model: 'gpt-test',
			system: 'sys',
			messages: [
				{ role: 'user', content: 'read it' },
				{
					role: 'assistant',
					content: [
						{ type: 'text', text: 'Reading.' },
						{
							type: 'tool_use',
							toolUseId: 'call-1',
							toolName: 'read_file',
							toolArgs: { path: 'README.md' },
						},
					],
				},
				{
					role: 'tool',
					toolUseId: 'call-1',
					isError: true,
					content: [
						{ type: 'text', text: 'failed' },
						{ type: 'image', mimeType: 'image/png', base64: 'abc' },
					],
				},
			],
			tools: [],
			maxTokens: 100,
		}));

		expect(create.mock.calls[0][0].messages).toEqual([
			{ role: 'system', content: 'sys' },
			{ role: 'user', content: 'read it' },
			{
				role: 'assistant',
				content: 'Reading.',
				tool_calls: [
					{
						id: 'call-1',
						type: 'function',
						function: { name: 'read_file', arguments: '{"path":"README.md"}' },
					},
				],
			},
			{ role: 'tool', tool_call_id: 'call-1', content: 'failed\n[binary content]' },
		]);
	});
});

describe('provider/anthropic', () => {
	it('normalizes Anthropic stream events', async () => {
		async function* chunks() {
			yield { type: 'message_start', message: { usage: { input_tokens: 4, output_tokens: 0 } } };
			yield { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 't1', name: 'exec' } };
			yield { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"command":"pwd"}' } };
			yield { type: 'content_block_stop', index: 0 };
			yield { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 5 } };
		}
		const adapter = new AnthropicAdapter({
			apiKey: 'ant-test',
			clientFactory: () => ({
				messages: { stream: jest.fn(() => chunks()) },
			}) as never,
		});

		const events = await collectAsync(adapter.stream({
			model: 'claude-test',
			system: 'sys',
			messages: [{ role: 'user', content: 'hello' }],
			tools: [{ name: 'exec', description: 'Exec', schema: { type: 'object' } }],
			maxTokens: 100,
		}));

		expect(events).toEqual([
			{ type: 'message_start' },
			{ type: 'tool_call_start', id: 't1', name: 'exec' },
			{ type: 'tool_call_args_delta', id: 't1', jsonDelta: '{"command":"pwd"}' },
			{ type: 'tool_call_end', id: 't1' },
			{ type: 'message_end', stopReason: 'tool_use', usage: { inputTokens: 4, outputTokens: 5 } },
		]);
	});

	it('converts prior tool calls and results into Anthropic messages', async () => {
		async function* chunks() {
			yield { type: 'message_start', message: { usage: { input_tokens: 1, output_tokens: 0 } } };
			yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 1 } };
		}
		const stream = jest.fn(() => chunks());
		const adapter = new AnthropicAdapter({
			apiKey: 'ant-test',
			clientFactory: () => ({
				messages: { stream },
			}) as never,
		});

		await collectAsync(adapter.stream({
			model: 'claude-test',
			system: 'sys',
			messages: [
				{ role: 'user', content: 'read it' },
				{
					role: 'assistant',
					content: [
						{ type: 'text', text: 'Reading.' },
						{
							type: 'tool_use',
							toolUseId: 'call-1',
							toolName: 'read_file',
							toolArgs: { path: 'README.md' },
						},
					],
				},
				{
					role: 'tool',
					toolUseId: 'call-1',
					isError: true,
					content: [
						{ type: 'text', text: 'failed' },
						{ type: 'image', mimeType: 'image/png', base64: 'abc' },
					],
				},
			],
			tools: [],
			maxTokens: 100,
		}));

		expect(stream.mock.calls[0][0].messages).toEqual([
			{ role: 'user', content: 'read it' },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Reading.' },
					{
						type: 'tool_use',
						id: 'call-1',
						name: 'read_file',
						input: { path: 'README.md' },
					},
				],
			},
			{
				role: 'user',
				content: [
					{
						type: 'tool_result',
						tool_use_id: 'call-1',
						content: [
							{ type: 'text', text: 'failed' },
							{
								type: 'image',
								source: {
									type: 'base64',
									media_type: 'image/png',
									data: 'abc',
								},
							},
						],
						is_error: true,
					},
				],
			},
		]);
	});
});
