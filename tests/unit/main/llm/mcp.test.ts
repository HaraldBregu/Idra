import type Anthropic from '@anthropic-ai/sdk';
import type OpenAI from 'openai';
import { AgentModel } from '../../../../src/main/llm/model';
import { LlmService } from '../../../../src/main/llm/service';
import { adaptAnthropicMcpServers } from '../../../../src/main/llm/mcp/anthropic';
import { adaptOpenAIMcpTools } from '../../../../src/main/llm/mcp/openai';
import { toTranscriptEntry } from '../../../../src/main/llm/shared';
import type { ProviderStreamRequest } from '../../../../src/main/llm/types';

describe('MCP provider adapters', () => {
	it('adapts neutral MCP servers for OpenAI response tools', () => {
		expect(
			adaptOpenAIMcpTools([
				{
					serverLabel: 'gmail',
					serverUrl: 'https://gmail.example/mcp',
					connectorId: 'connector_gmail',
					authorization: 'token',
					requireApproval: 'always',
					allowedTools: ['search'],
					deferLoading: true,
					serverDescription: 'Gmail search',
				},
				{
					serverLabel: 'disabled',
					connectorId: 'connector_gmail',
					enabled: false,
				},
			])
		).toEqual([
				{
					type: 'mcp',
					server_label: 'gmail',
					connector_id: 'connector_gmail',
					authorization: 'token',
					require_approval: 'always',
				allowed_tools: ['search'],
				defer_loading: true,
				server_description: 'Gmail search',
			},
		]);
	});

	it('adapts neutral MCP servers for Anthropic beta MCP config', () => {
		expect(
			adaptAnthropicMcpServers([
				{
					serverLabel: 'gmail',
					connectorId: 'connector_gmail',
					deferLoading: true,
				},
				{
					serverLabel: 'filesystem',
					serverUrl: 'https://filesystem.example/mcp',
					connectorId: 'connector_filesystem',
					authorization: ' Bearer token ',
					allowedTools: ['search'],
					deferLoading: true,
				},
				{
					serverLabel: 'disabled',
					enabled: false,
				},
			])
		).toEqual({
			servers: [
				{
					type: 'url',
					name: 'filesystem',
					url: 'https://filesystem.example/mcp',
					authorization_token: 'token',
				},
			],
			tools: [
				{
					type: 'mcp_toolset',
					mcp_server_name: 'filesystem',
					default_config: { enabled: false, defer_loading: true },
					configs: {
						search: { enabled: true },
					},
				},
			],
		});
	});

	it('uses the basic Anthropic MCP toolset shape when all tools are enabled', () => {
		expect(
			adaptAnthropicMcpServers([
				{
					serverLabel: 'customer_ops',
					serverUrl: 'https://your-public-domain.example.com/mcp',
					deferLoading: false,
				},
			])
		).toEqual({
			servers: [
				{
					type: 'url',
					name: 'customer_ops',
					url: 'https://your-public-domain.example.com/mcp',
				},
			],
			tools: [
				{
					type: 'mcp_toolset',
					mcp_server_name: 'customer_ops',
				},
			],
		});
	});

	it('adds neutral MCP servers to OpenAI request tools', async () => {
		async function* stream(): AsyncIterable<unknown> {
			yield* [];
		}

		const create = jest.fn().mockResolvedValue(stream());
		const service = new LlmService({
			openAIClientFactory: () => ({ responses: { create } }) as unknown as OpenAI,
		});
		const model = service.build({ id: 'openai', apiKey: 'key' });

		const events: string[] = [];
		for await (const event of model.stream(request())) {
			events.push(event.type);
		}

		expect(events).toEqual(['message_start', 'message_end']);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				tools: [
					expect.objectContaining({
						type: 'mcp',
						server_label: 'gmail',
						connector_id: 'connector_gmail',
					}),
				],
			}),
			expect.any(Object)
		);
	});

	it('adds reasoning effort to OpenAI Responses requests', async () => {
		async function* stream(): AsyncIterable<unknown> {
			yield {
				type: 'response.output_text.delta',
				delta: 'hello',
			};
			yield {
				type: 'response.completed',
				response: {
					usage: { input_tokens: 3, output_tokens: 2 },
					output: [],
				},
			};
		}

		const create = jest.fn().mockResolvedValue(stream());
		const service = new LlmService({
			openAIClientFactory: () => ({ responses: { create } }) as unknown as OpenAI,
		});
		const model = service.build({ id: 'openai', apiKey: 'key' });

		const events: string[] = [];
		for await (const event of model.stream({ ...request(), effort: 'high' })) {
			events.push(event.type);
		}

		expect(events).toEqual(['message_start', 'text_delta', 'message_end']);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				reasoning: { effort: 'high' },
			}),
			expect.any(Object)
		);
	});

	it('emits OpenAI MCP output items as provider context items', async () => {
		const listItem = {
			id: 'mcpl_1',
			type: 'mcp_list_tools',
			server_label: 'gmail',
			tools: [{ name: 'search_emails', input_schema: { type: 'object' } }],
		};
		const callItem = {
			id: 'mcp_1',
			type: 'mcp_call',
			server_label: 'gmail',
			name: 'search_emails',
			arguments: '{"query":"from:alice"}',
			output: '{"messages":[]}',
		};
		async function* stream(): AsyncIterable<unknown> {
			yield { type: 'response.output_item.done', item: listItem };
			yield { type: 'response.output_item.done', item: callItem };
			yield { type: 'response.output_text.delta', delta: 'No messages.' };
			yield {
				type: 'response.completed',
				response: {
					usage: { input_tokens: 3, output_tokens: 2 },
					output: [listItem, callItem],
				},
			};
		}

		const create = jest.fn().mockResolvedValue(stream());
		const model = new AgentModel({
			openAIClientFactory: () => ({ responses: { create } }) as unknown as OpenAI,
		});

		const events: unknown[] = [];
		for await (const event of model.stream({
			provider: { id: 'openai', apiKey: 'key', baseURL: '' },
			model: 'test-model',
			messages: [{ role: 'user', content: 'check mail' }],
			tools: [],
			mcp: [],
			maxTokens: 128,
		})) {
			events.push(event);
		}

		expect(events).toContainEqual({
			type: 'model_provider_item',
			provider: 'openai',
			item: listItem,
		});
		expect(events).toContainEqual({
			type: 'model_provider_item',
			provider: 'openai',
			item: callItem,
		});
		expect(events).toContainEqual({ type: 'model_call_delta', delta: 'No messages.' });
	});

	it('preserves saved OpenAI MCP items when rebuilding transcript entries', () => {
		const item = {
			id: 'mcp_1',
			type: 'mcp_call',
			server_label: 'gmail',
			name: 'search_emails',
			arguments: '{}',
			output: '{}',
		};

		expect(
			toTranscriptEntry({
				role: 'assistant',
				content: [
					{ type: 'provider_item', provider: 'openai', item },
					{ type: 'text', text: 'Done.' },
				],
			})
		).toEqual({
			role: 'assistant',
			content: [
				{ type: 'provider_item', provider: 'openai', item },
				{ type: 'text', text: 'Done.' },
			],
		});
	});

	it('uses Anthropic beta messages when neutral MCP servers are present', async () => {
		async function* stream(): AsyncIterable<unknown> {
			yield* [];
		}

		const betaStream = jest.fn().mockReturnValue(stream());
		const betaCreate = jest.fn().mockResolvedValue({
			content: [{ type: 'text', text: 'Done.' }],
			stop_reason: 'end_turn',
			usage: { input_tokens: 3, output_tokens: 2 },
		});
		const messagesStream = jest.fn().mockReturnValue(stream());
		const service = new LlmService({
			anthropicClientFactory: () =>
				({
					beta: { messages: { create: betaCreate, stream: betaStream } },
					messages: { stream: messagesStream },
				}) as unknown as Anthropic,
		});
		const model = service.build({ id: 'anthropic', apiKey: 'key' });

		const events: string[] = [];
		for await (const event of model.stream(anthropicRequest())) {
			events.push(event.type);
		}

		expect(events).toEqual(['message_start', 'text_delta', 'message_end']);
		expect(betaCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				mcp_servers: [
					expect.objectContaining({
						type: 'url',
						name: 'filesystem',
						url: 'https://filesystem.example/mcp',
					}),
				],
				tools: [
					expect.objectContaining({
						type: 'mcp_toolset',
						mcp_server_name: 'filesystem',
						default_config: { enabled: false, defer_loading: true },
						configs: {
							search: { enabled: true },
						},
					}),
				],
				betas: ['mcp-client-2025-11-20'],
			}),
			expect.objectContaining({
				headers: { 'anthropic-beta': 'mcp-client-2025-11-20' },
			})
		);
		expect(betaStream).not.toHaveBeenCalled();
		expect(messagesStream).not.toHaveBeenCalled();
	});
});

function request(): ProviderStreamRequest {
	return {
		model: 'test-model',
		system: '',
		messages: [],
		tools: [],
		mcp: [
			{
				serverLabel: 'gmail',
				serverUrl: 'https://gmail.example/mcp',
				connectorId: 'connector_gmail',
			},
		],
		maxTokens: 128,
	};
}

function anthropicRequest(): ProviderStreamRequest {
	return {
		model: 'test-model',
		system: '',
		messages: [],
		tools: [],
		mcp: [
			{
				serverLabel: 'filesystem',
				serverUrl: 'https://filesystem.example/mcp',
				connectorId: 'connector_filesystem',
				allowedTools: ['search'],
				deferLoading: true,
			},
		],
		maxTokens: 128,
	};
}
