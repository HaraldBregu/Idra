import { AnthropicAdapter } from '../../../../src/main/provider/anthropic';
import { DeepSeekAdapter } from '../../../../src/main/provider/deepseek';
import { MistralAdapter } from '../../../../src/main/provider/mistral';
import { OpenAIAdapter, OpenAIChatAdapter } from '../../../../src/main/provider/openai';
import { QwenAdapter } from '../../../../src/main/provider/qwen';
import { makeProvider } from '../../../../src/main/provider/factory';
import { ProviderAuthError } from '../../../../src/main/provider/types';
import { collectAsync } from '../test-helpers';

describe('provider/factory', () => {
	it('returns native adapters for first-party providers and chat adapter for compatible providers', () => {
		expect(makeProvider({ id: 'anthropic', apiKey: 'key' })).toBeInstanceOf(AnthropicAdapter);
		expect(makeProvider({ id: 'mistral', apiKey: 'key' })).toBeInstanceOf(MistralAdapter);
		expect(makeProvider({ id: 'mistal', apiKey: 'key' })).toBeInstanceOf(MistralAdapter);
		expect(makeProvider({ id: 'openai', apiKey: 'key' })).toBeInstanceOf(OpenAIAdapter);
		expect(makeProvider({ id: 'deepseek', apiKey: 'key' })).toBeInstanceOf(DeepSeekAdapter);
		expect(makeProvider({ id: 'qwen', apiKey: 'key' })).toBeInstanceOf(QwenAdapter);
		expect(makeProvider({ id: 'groq', apiKey: 'key' })).toBeInstanceOf(OpenAIChatAdapter);
	});

	it('throws ProviderAuthError when the API key is empty', () => {
		expect(() => makeProvider({ id: 'openai', apiKey: '' })).toThrow(ProviderAuthError);
	});
});

describe('provider/openai', () => {
	it('normalizes Responses API stream events', async () => {
		const create = jest.fn(async () => chunks());
		async function* chunks() {
			yield { type: 'response.output_text.delta', delta: 'hi ', output_index: 0, content_index: 0, item_id: 'msg1', sequence_number: 1 };
			yield { type: 'response.output_item.added', output_index: 1, sequence_number: 2, item: { type: 'function_call', call_id: 'call1', name: 'read', arguments: '' } };
			yield { type: 'response.function_call_arguments.delta', output_index: 1, item_id: 'item1', delta: '{"path"', sequence_number: 3 };
			yield { type: 'response.function_call_arguments.delta', output_index: 1, item_id: 'item1', delta: ':"a"}', sequence_number: 4 };
			yield { type: 'response.function_call_arguments.done', output_index: 1, item_id: 'item1', name: 'read', arguments: '{"path":"a"}', sequence_number: 5 };
			yield {
				type: 'response.completed',
				sequence_number: 6,
				response: {
					output: [{ type: 'function_call', call_id: 'call1', name: 'read', arguments: '{"path":"a"}' }],
					usage: { input_tokens: 2, output_tokens: 3 },
				},
			};
		}
		const adapter = new OpenAIAdapter({
			apiKey: 'sk-test',
			clientFactory: () => ({
				responses: { create },
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
			expect.objectContaining({
				max_output_tokens: 100,
				stream: true,
				tools: [
					{
						type: 'function',
						name: 'read',
						description: 'Read',
						parameters: { type: 'object' },
						strict: false,
					},
				],
			}),
			expect.any(Object)
		);
	});

	it('uses Responses API reasoning effort and max output tokens for GPT-5 requests', async () => {
		async function* chunks() {
			yield {
				type: 'response.completed',
				sequence_number: 1,
				response: { output: [], usage: { input_tokens: 1, output_tokens: 2 } },
			};
		}
		const create = jest.fn(async () => chunks());
		const adapter = new OpenAIAdapter({
			apiKey: 'sk-test',
			clientFactory: () => ({
				responses: { create },
			}) as never,
		});

		await collectAsync(adapter.stream({
			model: 'gpt-5.5',
			effort: 'minimal',
			system: 'sys',
			messages: [{ role: 'user', content: 'hello' }],
			tools: [],
			maxTokens: 100,
		}));

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				max_output_tokens: 100,
				reasoning: { effort: 'minimal' },
			}),
			expect.any(Object)
		);
		expect(create.mock.calls[0][0]).not.toHaveProperty('max_completion_tokens');
		expect(create.mock.calls[0][0]).not.toHaveProperty('reasoning_effort');
	});

	it('converts prior tool calls, reasoning, and results into Responses input items', async () => {
		async function* chunks() {
			yield {
				type: 'response.completed',
				sequence_number: 1,
				response: { output: [], usage: { input_tokens: 1, output_tokens: 1 } },
			};
		}
		const create = jest.fn(async () => chunks());
		const adapter = new OpenAIAdapter({
			apiKey: 'sk-test',
			clientFactory: () => ({
				responses: { create },
			}) as never,
		});

		const reasoning = {
			id: 'rs1',
			type: 'reasoning',
			summary: [],
			encrypted_content: 'encrypted',
		};
		await collectAsync(adapter.stream({
			model: 'gpt-test',
			system: 'sys',
			messages: [
				{ role: 'user', content: 'read it' },
				{
					role: 'assistant',
					content: [
						{ type: 'reasoning', provider: 'openai', item: reasoning },
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

		expect(create.mock.calls[0][0].instructions).toBe('sys');
		expect(create.mock.calls[0][0].input).toEqual([
			{ role: 'user', content: 'read it' },
			reasoning,
			{
				type: 'message',
				role: 'assistant',
				content: 'Reading.',
				phase: 'commentary',
			},
			{
				type: 'function_call',
				call_id: 'call-1',
				name: 'read_file',
				arguments: '{"path":"README.md"}',
			},
			{ type: 'function_call_output', call_id: 'call-1', output: 'failed\n[binary content]' },
		]);
	});

	it('omits empty assistant messages when Responses input has tool calls and no text', async () => {
		async function* chunks() {
			yield {
				type: 'response.completed',
				sequence_number: 1,
				response: { output: [], usage: { input_tokens: 1, output_tokens: 1 } },
			};
		}
		const create = jest.fn(async () => chunks());
		const adapter = new OpenAIAdapter({
			apiKey: 'sk-test',
			clientFactory: () => ({
				responses: { create },
			}) as never,
		});

		await collectAsync(adapter.stream({
			model: 'gpt-test',
			system: '',
			messages: [
				{ role: 'user', content: 'read it' },
				{
					role: 'assistant',
					content: [
						{
							type: 'tool_use',
							toolUseId: 'call-1',
							toolName: 'read_file',
							toolArgs: { path: 'README.md' },
						},
					],
				},
			],
			tools: [],
			maxTokens: 100,
		}));

		expect(create.mock.calls[0][0].input).toEqual([
			{ role: 'user', content: 'read it' },
			{
				type: 'function_call',
				call_id: 'call-1',
				name: 'read_file',
				arguments: '{"path":"README.md"}',
			},
		]);
	});
});

describe('provider/mistral', () => {
	it('normalizes Mistral stream events', async () => {
		async function* chunks() {
			yield {
				data: {
					choices: [{ index: 0, delta: { content: 'hi ' }, finishReason: null }],
				},
			};
			yield {
				data: {
					choices: [
						{
							index: 0,
							delta: {
								toolCalls: [
									{
										id: 'call-1',
										type: 'function',
										index: 0,
										function: { name: 'read', arguments: '{"path"' },
									},
								],
							},
							finishReason: null,
						},
					],
				},
			};
			yield {
				data: {
					usage: { promptTokens: 2, completionTokens: 3 },
					choices: [
						{
							index: 0,
							delta: {
								toolCalls: [
									{
										id: 'call-1',
										type: 'function',
										index: 0,
										function: { name: 'read', arguments: '{"path":"a"}' },
									},
								],
							},
							finishReason: 'tool_calls',
						},
					],
				},
			};
		}
		const stream = jest.fn(async () => chunks());
		const adapter = new MistralAdapter({
			apiKey: 'mis-test',
			clientFactory: () => ({ chat: { stream } }),
		});

		const events = await collectAsync(adapter.stream({
			model: 'mistral-test',
			system: 'sys',
			messages: [{ role: 'user', content: 'hello' }],
			tools: [{ name: 'read', description: 'Read', schema: { type: 'object' } }],
			maxTokens: 100,
		}));

		expect(events).toEqual([
			{ type: 'message_start' },
			{ type: 'text_delta', text: 'hi ' },
			{ type: 'tool_call_start', id: 'call-1', name: 'read' },
			{ type: 'tool_call_args_delta', id: 'call-1', jsonDelta: '{"path"' },
			{ type: 'tool_call_args_delta', id: 'call-1', jsonDelta: ':"a"}' },
			{ type: 'tool_call_end', id: 'call-1' },
			{ type: 'message_end', stopReason: 'tool_calls', usage: { inputTokens: 2, outputTokens: 3 } },
		]);
		expect(stream).toHaveBeenCalledWith(
			expect.objectContaining({
				model: 'mistral-test',
				maxTokens: 100,
				messages: [
					{ role: 'system', content: 'sys' },
					{ role: 'user', content: 'hello' },
				],
				tools: [
					{
						type: 'function',
						function: {
							name: 'read',
							description: 'Read',
							parameters: { type: 'object' },
						},
					},
				],
				toolChoice: 'auto',
			}),
			expect.any(Object)
		);
	});

	it('converts prior tool calls and results into Mistral messages', async () => {
		async function* chunks() {
			yield {
				data: {
					usage: { promptTokens: 1, completionTokens: 1 },
					choices: [{ index: 0, delta: {}, finishReason: 'stop' }],
				},
			};
		}
		const stream = jest.fn(async () => chunks());
		const adapter = new MistralAdapter({
			apiKey: 'mis-test',
			clientFactory: () => ({ chat: { stream } }),
		});

		await collectAsync(adapter.stream({
			model: 'mistral-test',
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
			{ role: 'system', content: 'sys' },
			{ role: 'user', content: 'read it' },
			{
				role: 'assistant',
				content: 'Reading.',
				toolCalls: [
					{
						id: 'call-1',
						type: 'function',
						index: 0,
						function: { name: 'read_file', arguments: '{"path":"README.md"}' },
					},
				],
			},
			{
				role: 'tool',
				toolCallId: 'call-1',
				name: 'read_file',
				content: 'failed\n[binary content]',
			},
		]);
	});

	it('normalizes the stored Mistral /v1 URL for the SDK server URL', () => {
		const clientFactory = jest.fn(() => ({
			chat: { stream: jest.fn() },
		}));

		new MistralAdapter({
			apiKey: 'mis-test',
			baseURL: 'https://api.mistral.ai/v1',
			clientFactory,
		});

		expect(clientFactory).toHaveBeenCalledWith({
			apiKey: 'mis-test',
			serverURL: 'https://api.mistral.ai',
		});
	});
});

describe('provider/deepseek', () => {
	function makeClient(chunks: () => AsyncGenerator<unknown>) {
		const create = jest.fn(async () => chunks());
		return { client: { chat: { completions: { create } } }, create };
	}

	async function* basicChunks() {
		yield { choices: [{ delta: { content: 'hello' }, finish_reason: null }], usage: null };
		yield { choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 5 } };
	}

	it('normalizes DeepSeek stream events', async () => {
		const { client, create } = makeClient(basicChunks);
		const adapter = new DeepSeekAdapter({
			apiKey: 'ds-test',
			clientFactory: () => client as never,
		});

		const events = await collectAsync(adapter.stream({
			model: 'deepseek-v4-flash',
			system: 'sys',
			messages: [{ role: 'user', content: 'hi' }],
			tools: [],
			maxTokens: 100,
		}));

		expect(events).toEqual([
			{ type: 'message_start' },
			{ type: 'text_delta', text: 'hello' },
			{ type: 'message_end', stopReason: 'end_turn', usage: { inputTokens: 3, outputTokens: 5 } },
		]);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				model: 'deepseek-v4-flash',
				stream: true,
				thinking: { type: 'enabled' },
			}),
			expect.any(Object)
		);
	});

	it('passes DeepSeek thinking controls for supported effort values', async () => {
		const { client, create } = makeClient(basicChunks);
		const adapter = new DeepSeekAdapter({
			apiKey: 'ds-test',
			clientFactory: () => client as never,
		});

		await collectAsync(adapter.stream({
			model: 'deepseek-v4-pro',
			effort: 'high',
			system: 'sys',
			messages: [{ role: 'user', content: 'think' }],
			tools: [],
			maxTokens: 100,
		}));

		expect(create.mock.calls[0][0]).toHaveProperty('reasoning_effort', 'high');
		expect(create.mock.calls[0][0]).toHaveProperty('thinking', { type: 'enabled' });
	});

	it('maps extra high DeepSeek effort to max', async () => {
		const { client, create } = makeClient(basicChunks);
		const adapter = new DeepSeekAdapter({
			apiKey: 'ds-test',
			clientFactory: () => client as never,
		});

		await collectAsync(adapter.stream({
			model: 'deepseek-v4-pro',
			effort: 'xhigh',
			system: 'sys',
			messages: [{ role: 'user', content: 'hi' }],
			tools: [],
			maxTokens: 100,
		}));

		expect(create.mock.calls[0][0]).toHaveProperty('reasoning_effort', 'max');
	});

	it('disables DeepSeek thinking when effort is none', async () => {
		const { client, create } = makeClient(basicChunks);
		const adapter = new DeepSeekAdapter({
			apiKey: 'ds-test',
			clientFactory: () => client as never,
		});

		await collectAsync(adapter.stream({
			model: 'deepseek-v4-pro',
			effort: 'none',
			system: 'sys',
			messages: [{ role: 'user', content: 'hi' }],
			tools: [],
			maxTokens: 100,
		}));

		expect(create.mock.calls[0][0]).toHaveProperty('thinking', { type: 'disabled' });
		expect(create.mock.calls[0][0]).not.toHaveProperty('reasoning_effort');
	});

	it('round-trips DeepSeek reasoning_content for tool-call turns', async () => {
		const { client, create } = makeClient(basicChunks);
		const adapter = new DeepSeekAdapter({
			apiKey: 'ds-test',
			clientFactory: () => client as never,
		});

		await collectAsync(adapter.stream({
			model: 'deepseek-v4-pro',
			effort: 'high',
			system: '',
			messages: [
				{
					role: 'assistant',
					content: [
						{ type: 'reasoning', provider: 'deepseek', item: 'I need a tool.' },
						{ type: 'text', text: 'Checking.' },
						{
							type: 'tool_use',
							toolUseId: 'call-1',
							toolName: 'get_date',
							toolArgs: {},
						},
					],
				},
				{
					role: 'tool',
					toolUseId: 'call-1',
					content: [{ type: 'text', text: '2026-05-21' }],
				},
			],
			tools: [],
			maxTokens: 100,
		}));

		expect(create.mock.calls[0][0].messages[0]).toEqual({
			role: 'assistant',
			content: 'Checking.',
			reasoning_content: 'I need a tool.',
			tool_calls: [
				{
					id: 'call-1',
					type: 'function',
					function: { name: 'get_date', arguments: '{}' },
				},
			],
		});
	});

	it('emits streamed DeepSeek reasoning_content as provider reasoning items', async () => {
		async function* chunks() {
			yield {
				choices: [{ delta: { reasoning_content: 'Think.' }, finish_reason: null }],
				usage: null,
			};
			yield {
				choices: [{ delta: { content: 'Done.' }, finish_reason: null }],
				usage: null,
			};
			yield {
				choices: [{ delta: {}, finish_reason: 'stop' }],
				usage: { prompt_tokens: 1, completion_tokens: 2 },
			};
		}
		const { client } = makeClient(chunks);
		const adapter = new DeepSeekAdapter({
			apiKey: 'ds-test',
			clientFactory: () => client as never,
		});

		const events = await collectAsync(adapter.stream({
			model: 'deepseek-v4-pro',
			effort: 'high',
			system: '',
			messages: [{ role: 'user', content: 'hi' }],
			tools: [],
			maxTokens: 100,
		}));

		expect(events).toContainEqual({
			type: 'reasoning_item',
			provider: 'deepseek',
			item: 'Think.',
		});
		expect(events).toContainEqual({ type: 'text_delta', text: 'Done.' });
	});

	it('defaults to the DeepSeek base URL when none is provided', () => {
		const clientFactory = jest.fn(() => ({ chat: { completions: { create: jest.fn() } } }));
		new DeepSeekAdapter({ apiKey: 'ds-test', clientFactory: clientFactory as never });
		expect(clientFactory).toHaveBeenCalledWith(
			expect.objectContaining({ baseURL: 'https://api.deepseek.com' })
		);
	});

	it('respects a custom base URL when provided', () => {
		const clientFactory = jest.fn(() => ({ chat: { completions: { create: jest.fn() } } }));
		new DeepSeekAdapter({ apiKey: 'ds-test', baseURL: 'https://custom.example.com', clientFactory: clientFactory as never });
		expect(clientFactory).toHaveBeenCalledWith(
			expect.objectContaining({ baseURL: 'https://custom.example.com' })
		);
	});
});

describe('provider/qwen', () => {
	function makeClient() {
		const create = jest.fn(async function* () {
			yield { choices: [{ delta: { content: 'hello' }, finish_reason: null }], usage: null };
			yield { choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 2, completion_tokens: 4 } };
		});
		return { client: { chat: { completions: { create } } }, create };
	}

	it('normalizes Qwen stream events', async () => {
		const { client, create } = makeClient();
		const adapter = new QwenAdapter({
			apiKey: 'qw-test',
			clientFactory: () => client as never,
		});

		const events = await collectAsync(adapter.stream({
			model: 'qwen3-max',
			system: 'sys',
			messages: [{ role: 'user', content: 'hi' }],
			tools: [],
			maxTokens: 100,
		}));

		expect(events).toEqual([
			{ type: 'message_start' },
			{ type: 'text_delta', text: 'hello' },
			{ type: 'message_end', stopReason: 'end_turn', usage: { inputTokens: 2, outputTokens: 4 } },
		]);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ model: 'qwen3-max', stream: true }),
			expect.any(Object)
		);
	});

	it('defaults to the Qwen base URL when none is provided', () => {
		const clientFactory = jest.fn(() => ({ chat: { completions: { create: jest.fn() } } }));
		new QwenAdapter({ apiKey: 'qw-test', clientFactory: clientFactory as never });
		expect(clientFactory).toHaveBeenCalledWith(
			expect.objectContaining({ baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1' })
		);
	});

	it('respects a custom base URL when provided', () => {
		const clientFactory = jest.fn(() => ({ chat: { completions: { create: jest.fn() } } }));
		new QwenAdapter({ apiKey: 'qw-test', baseURL: 'https://custom.example.com', clientFactory: clientFactory as never });
		expect(clientFactory).toHaveBeenCalledWith(
			expect.objectContaining({ baseURL: 'https://custom.example.com' })
		);
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

	it('uses Anthropic usage snapshots without double counting streamed deltas', async () => {
		async function* chunks() {
			yield { type: 'message_start', message: { usage: { input_tokens: 4, output_tokens: 0 } } };
			yield { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } };
			yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hi' } };
			yield { type: 'message_delta', delta: { stop_reason: null }, usage: { output_tokens: 2 } };
			yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 3 } };
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
			tools: [],
			maxTokens: 100,
		}));

		expect(events.at(-1)).toEqual({
			type: 'message_end',
			stopReason: 'end_turn',
			usage: { inputTokens: 4, outputTokens: 3 },
		});
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
