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
		async function* chunks() {
			yield { choices: [{ delta: { content: 'hi ' } }] };
			yield { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call1', function: { name: 'read', arguments: '{"path"' } }] } }] };
			yield { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: ':"a"}' } }] } }] };
			yield { choices: [{ delta: {}, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 2, completion_tokens: 3 } };
		}
		const adapter = new OpenAIAdapter({
			apiKey: 'sk-test',
			clientFactory: () => ({
				chat: { completions: { create: jest.fn(async () => chunks()) } },
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
});
