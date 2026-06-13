import type Anthropic from '@anthropic-ai/sdk';
import type OpenAI from 'openai';
import { adaptAnthropicMcpServers } from '../../../../src/main/llm/mcp/anthropic';
import { adaptOpenAIMcpTools } from '../../../../src/main/llm/mcp/openai';
import { AnthropicAdapter } from '../../../../src/main/llm/providers/anthropic';
import { OpenAIAdapter } from '../../../../src/main/llm/providers/openai';
import type { ProviderStreamRequest } from '../../../../src/main/llm/types';

describe('MCP provider adapters', () => {
	it('adapts neutral MCP servers for OpenAI response tools', () => {
		expect(
			adaptOpenAIMcpTools([
				{
					serverLabel: 'gmail',
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
					deferLoading: true,
				},
				{
					serverLabel: 'disabled',
					enabled: false,
				},
			])
		).toEqual({
			servers: [],
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
		const adapter = new OpenAIAdapter({
			apiKey: 'key',
			clientFactory: () => ({ responses: { create } }) as unknown as OpenAI,
		});

		const events: string[] = [];
		for await (const event of adapter.stream(request())) {
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

	it('uses Anthropic beta messages when neutral MCP servers are present', async () => {
		async function* stream(): AsyncIterable<unknown> {
			yield* [];
		}

		const betaStream = jest.fn().mockReturnValue(stream());
		const messagesStream = jest.fn().mockReturnValue(stream());
		const adapter = new AnthropicAdapter({
			apiKey: 'key',
			clientFactory: () =>
				({
					beta: { messages: { stream: betaStream } },
					messages: { stream: messagesStream },
				}) as unknown as Anthropic,
		});

		const events: string[] = [];
		for await (const event of adapter.stream(request())) {
			events.push(event.type);
		}

		expect(events).toEqual(['message_start', 'message_end']);
		expect(betaStream).toHaveBeenCalledWith(
			expect.objectContaining({
				mcp_servers: [],
				tools: [],
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
				connectorId: 'connector_gmail',
			},
		],
		maxTokens: 128,
	};
}
