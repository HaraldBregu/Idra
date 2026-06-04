import { AnthropicAdapter } from '../../../../src/main/llm/providers/anthropic';

async function* completedStream(): AsyncIterable<unknown> {
	yield {
		type: 'message_start',
		message: {
			usage: { input_tokens: 2, output_tokens: 0 },
		},
	};
	yield {
		type: 'message_delta',
		delta: { stop_reason: 'end_turn' },
		usage: { output_tokens: 4 },
	};
}

describe('AnthropicAdapter MCP request construction', () => {
	it('uses beta MCP server and toolset fields for Anthropic remote MCP tools', async () => {
		const stableStream = jest.fn();
		const betaStream = jest.fn(() => completedStream());
		const adapter = new AnthropicAdapter({
			apiKey: 'anthropic-key',
			clientFactory: () => ({
				messages: { stream: stableStream },
				beta: { messages: { stream: betaStream } },
			}) as never,
		});

		const events = [];
		for await (const event of adapter.stream({
			model: 'claude-opus-4-8',
			system: '',
			messages: [{ role: 'user', content: 'What tools do you have available?' }],
			tools: [],
			builtInTools: [
				{
					type: 'mcp_toolset',
					mcp_server_name: 'example-mcp',
					server: {
						type: 'url',
						name: 'example-mcp',
						url: 'https://example-server.modelcontextprotocol.io/sse',
						authorization_token: 'token',
					},
				},
			],
			maxTokens: 1000,
		})) {
			events.push(event);
		}

		expect(stableStream).not.toHaveBeenCalled();
		expect(betaStream).toHaveBeenCalledWith(
			expect.objectContaining({
				mcp_servers: [
					{
						type: 'url',
						name: 'example-mcp',
						url: 'https://example-server.modelcontextprotocol.io/sse',
						authorization_token: 'token',
					},
				],
				tools: [
					{
						type: 'mcp_toolset',
						mcp_server_name: 'example-mcp',
					},
				],
				betas: ['mcp-client-2025-11-20'],
			}),
			{ signal: undefined }
		);
		expect(events.at(-1)).toEqual({
			type: 'message_end',
			stopReason: 'end_turn',
			usage: { inputTokens: 2, outputTokens: 4 },
		});
	});
});
