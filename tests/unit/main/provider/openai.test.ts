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
					type: 'response.created',
					response: { id: 'resp_1' },
				};
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
			type: 'response_created',
			id: 'resp_1',
		});
		expect(events).toContainEqual({
			type: 'mcp_approval_request',
			id: 'approval_1',
			serverLabel: 'acme_mail',
			name: 'send_email',
			arguments: '{"to":"a@example.com"}',
		});
	});

	it('surfaces runtime MCP tool lists from OpenAI connector responses', async () => {
		const create = jest.fn(() =>
			(async function* (): AsyncIterable<unknown> {
				yield {
					type: 'response.output_item.done',
					output_index: 0,
					item: {
						id: 'list_1',
						type: 'mcp_list_tools',
						server_label: 'gmail',
						tools: [
							{
								name: 'search_threads',
								description: 'Search Gmail threads.',
								input_schema: { type: 'object', properties: {} },
							},
						],
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
			messages: [{ role: 'user', content: 'search gmail' }],
			tools: [],
			maxTokens: 100,
		})) {
			events.push(event);
		}

		expect(events).toContainEqual(expect.objectContaining({
			type: 'mcp_list_tools',
			serverLabel: 'gmail',
			tools: [
				{
					name: 'search_threads',
					description: 'Search Gmail threads.',
					inputSchema: { type: 'object', properties: {} },
				},
			],
		}));
	});

	it('surfaces OpenAI MCP call output items', async () => {
		const create = jest.fn(() =>
			(async function* (): AsyncIterable<unknown> {
				yield {
					type: 'response.output_item.done',
					output_index: 0,
					item: {
						id: 'mcp_1',
						type: 'mcp_call',
						server_label: 'dmcp',
						name: 'roll',
						arguments: '{"diceRollExpression":"2d4+1"}',
						output: '5',
						error: null,
						status: 'completed',
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
			messages: [{ role: 'user', content: 'roll dice' }],
			tools: [],
			maxTokens: 100,
		})) {
			events.push(event);
		}

		expect(events).toContainEqual(expect.objectContaining({
			type: 'mcp_call',
			id: 'mcp_1',
			serverLabel: 'dmcp',
			name: 'roll',
			arguments: '{"diceRollExpression":"2d4+1"}',
			output: '5',
			error: undefined,
			status: 'completed',
		}));
	});

	it('can create an OpenAI MCP approval continuation request', async () => {
		const create = jest.fn(() => completedStream());
		const adapter = new OpenAIAdapter({
			apiKey: 'openai-key',
			clientFactory: () => ({ responses: { create } }) as never,
		});

		for await (const _event of adapter.stream({
			model: 'gpt-5.4',
			system: '',
			messages: [],
			inputItems: [
				{
					type: 'mcp_approval_response',
					approve: true,
					approval_request_id: 'approval_1',
				},
			],
			previousResponseId: 'resp_1',
			tools: [],
			maxTokens: 100,
		})) {
			// consume stream
		}

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				previous_response_id: 'resp_1',
				input: [
					{
						type: 'mcp_approval_response',
						approve: true,
						approval_request_id: 'approval_1',
					},
				],
			}),
			{ signal: undefined }
		);
	});

	it('replays provider-native MCP list items in Responses input context', async () => {
		const create = jest.fn(() => completedStream());
		const adapter = new OpenAIAdapter({
			apiKey: 'openai-key',
			clientFactory: () => ({ responses: { create } }) as never,
		});
		const mcpListToolsItem = {
			id: 'list_1',
			type: 'mcp_list_tools',
			server_label: 'gmail',
			tools: [
				{
					name: 'search_threads',
					description: 'Search Gmail threads.',
					input_schema: { type: 'object', properties: {} },
				},
			],
		};

		for await (const _event of adapter.stream({
			model: 'gpt-5.4',
			system: '',
			messages: [
				{
					role: 'assistant',
					content: [
						{
							type: 'provider_item',
							provider: 'openai',
							item: mcpListToolsItem,
						},
					],
				},
			],
			tools: [],
			maxTokens: 100,
		})) {
			// consume stream
		}

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				input: [mcpListToolsItem],
			}),
			{ signal: undefined }
		);
	});
});
