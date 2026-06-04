import { OpenAIAdapter } from '../../../../src/main/llm/providers/openai';

async function* completedStream(): AsyncIterable<unknown> {
	yield {
		type: 'response.completed',
		response: {
			output: [],
			usage: { input_tokens: 3, output_tokens: 5 },
		},
	};
}

describe('OpenAIAdapter Responses request construction', () => {
	it('includes function tools and OpenAI connector MCP tools', async () => {
		const create = jest.fn(() => completedStream());
		const adapter = new OpenAIAdapter({
			apiKey: 'openai-key',
			clientFactory: () => ({ responses: { create } }) as never,
		});

		const events = [];
		for await (const event of adapter.stream({
			model: 'gpt-5.4',
			system: 'system',
			messages: [{ role: 'user', content: 'hello' }],
			tools: [
				{
					name: 'local_tool',
					description: 'Local tool',
					schema: { type: 'object', properties: {} },
				},
			],
			builtInTools: [
				{
					type: 'mcp',
					server_label: 'acme_mail',
					connector_id: 'connector_acme_mail',
					authorization: 'acme-token',
					require_approval: 'always',
				},
			],
			maxTokens: 100,
		})) {
			events.push(event);
		}

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				tools: [
					expect.objectContaining({ type: 'function', name: 'local_tool' }),
					expect.objectContaining({
						type: 'mcp',
						server_label: 'acme_mail',
						connector_id: 'connector_acme_mail',
						authorization: 'acme-token',
					}),
				],
			}),
			{ signal: undefined }
		);
		expect(events.at(-1)).toEqual({
			type: 'message_end',
			stopReason: 'end_turn',
			usage: { inputTokens: 3, outputTokens: 5 },
		});
	});

	it('surfaces OpenAI MCP approval requests without creating function calls', async () => {
		const create = jest.fn(() =>
			(async function* (): AsyncIterable<unknown> {
				yield {
					type: 'response.output_item.done',
					output_index: 0,
					item: {
						id: 'approval_1',
						type: 'mcp_approval_request',
						server_label: 'acme_mail',
						name: 'send_email',
						arguments: '{"to":"a@example.com"}',
					},
				};
			})()
		);
		const adapter = new OpenAIAdapter({
			apiKey: 'openai-key',
			clientFactory: () => ({ responses: { create } }) as never,
		});

		const events = [];
		for await (const event of adapter.stream({
			model: 'gpt-5.4',
			system: '',
			messages: [{ role: 'user', content: 'send mail' }],
			tools: [],
			maxTokens: 100,
		})) {
			events.push(event);
		}

		expect(events).toContainEqual({
			type: 'mcp_approval_request',
			id: 'approval_1',
			serverLabel: 'acme_mail',
			name: 'send_email',
			arguments: '{"to":"a@example.com"}',
		});
	});
});
