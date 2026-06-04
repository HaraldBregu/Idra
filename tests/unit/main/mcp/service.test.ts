import { McpService } from '../../../../src/main/mcp';

describe('McpService', () => {
	it('returns OpenAI remote MCP tools from saved connectors', () => {
		const service = new McpService({
			getConnectorSettings: () => ({
				stripe: {
					type: 'mcp',
					server_label: 'stripe',
					server_url: 'https://mcp.stripe.com',
					authorization: '$STRIPE_OAUTH_ACCESS_TOKEN',
				},
				disabled: {
					type: 'mcp',
					server_label: 'disabled',
					server_url: 'https://mcp.example.com',
					enabled: false,
				},
			}),
		} as never);

		expect(service.createOpenAITools()).toEqual([
			{
				type: 'mcp',
				server_label: 'stripe',
				server_url: 'https://mcp.stripe.com',
				authorization: '$STRIPE_OAUTH_ACCESS_TOKEN',
			},
		]);
	});
});
