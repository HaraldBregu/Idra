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

	it('returns provider-specific remote MCP tool specs from saved connectors', () => {
		const service = new McpService({
			getConnectorSettings: () => ({
				stripe: {
					type: 'mcp',
					server_label: 'stripe',
					server_url: 'https://mcp.stripe.com',
					authorization: '$STRIPE_OAUTH_ACCESS_TOKEN',
					defer_loading: true,
				},
			}),
		} as never);

		expect(service.createToolsForProvider('openai')).toEqual([
			{
				type: 'mcp',
				server_label: 'stripe',
				server_url: 'https://mcp.stripe.com',
				authorization: '$STRIPE_OAUTH_ACCESS_TOKEN',
				defer_loading: true,
			},
		]);
		expect(service.createToolsForProvider('anthropic')).toEqual([
			{
				type: 'mcp_toolset',
				mcp_server_name: 'stripe',
				defer_loading: true,
				server: {
					type: 'url',
					name: 'stripe',
					url: 'https://mcp.stripe.com',
					authorization_token: '$STRIPE_OAUTH_ACCESS_TOKEN',
				},
			},
		]);
		expect(service.createToolsForProvider('other')).toEqual([]);
	});
});
