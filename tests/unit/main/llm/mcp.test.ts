import type Anthropic from '@anthropic-ai/sdk';
import type OpenAI from 'openai';
import { LlmService } from '../../../../src/main/llm/service';
import { adaptAnthropicMcpServers } from '../../../../src/main/llm/mcp/anthropic';
import { adaptOpenAIMcpTools } from '../../../../src/main/llm/mcp/openai';
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
					authorization: 'token',
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
					tool_configuration: { allowed_tools: ['search'] },
				},
			],
			tools: [
				{
					type: 'mcp_toolset',
					mcp_server_name: 'filesystem',
					default_config: { defer_loading: true },
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

	it('uses Anthropic beta messages when neutral MCP servers are present', async () => {
		async function* stream(): AsyncIterable<unknown> {
			yield* [];
		}

		const betaStream = jest.fn().mockReturnValue(stream());
		const messagesStream = jest.fn().mockReturnValue(stream());
		const service = new LlmService({
			anthropicClientFactory: () =>
				({
					beta: { messages: { stream: betaStream } },
					messages: { stream: messagesStream },
				}) as unknown as Anthropic,
		});
		const model = service.build({ id: 'anthropic', apiKey: 'key' });

		const events: string[] = [];
		for await (const event of model.stream(anthropicRequest())) {
			events.push(event.type);
		}

		expect(events).toEqual(['message_start', 'message_end']);
		expect(betaStream).toHaveBeenCalledWith(
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
					}),
				],
			}),
			expect.any(Object)
		);
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
			},
		],
		maxTokens: 128,
	};
}
