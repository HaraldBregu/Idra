import { McpRemoteService } from '../../../../src/main/mcp';

describe('McpRemoteService', () => {
	it('creates OpenAI remote MCP tools from enabled saved connectors', () => {
		const service = new McpRemoteService({
			getConnectorSettings: () => ({
				stripe: {
					type: 'mcp',
					server_label: 'stripe',
					server_url: 'https://mcp.stripe.com',
					authorization: 'stripe-token',
					require_approval: 'never',
				},
				disabled: {
					type: 'mcp',
					server_label: 'disabled',
					server_url: 'https://mcp.example.com',
					enabled: false,
				},
			}),
		} as never);

		expect(service.createToolsForProvider('openai')).toEqual([
			{
				type: 'mcp',
				server_label: 'stripe',
				connector_id: 'stripe',
				server_url: 'https://mcp.stripe.com',
				authorization: 'stripe-token',
				require_approval: 'never',
			},
		]);
	});

	it('creates Anthropic MCP server toolsets from enabled saved connectors', () => {
		const service = new McpRemoteService({
			getConnectorSettings: () => ({
				stripe: {
					type: 'mcp',
					server_label: 'stripe',
					server_url: 'https://mcp.stripe.com',
					authorization: 'stripe-token',
				},
			}),
		} as never);

		expect(service.createToolsForProvider('anthropic')).toEqual([
			{
				type: 'mcp_toolset',
				mcp_server_name: 'stripe',
				server: {
					type: 'url',
					name: 'stripe',
					url: 'https://mcp.stripe.com',
					authorization_token: 'stripe-token',
				},
			},
		]);
	});
});
