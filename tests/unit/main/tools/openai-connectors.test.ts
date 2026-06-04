import { openAiConnectorToolsTool } from '../../../../src/main/tools';

describe('openai_connector_tools tool', () => {
	it('returns OpenAI MCP connector specs from ConnectorToolsService', async () => {
		const result = await openAiConnectorToolsTool.execute({}, {
			services: {
				connectorTools: {
					createOpenAIConnectorTools: () => [
						{
							type: 'mcp',
							server_label: 'acme',
							server_url: 'https://mcp.example.com/sse',
							authorization: 'mcp-token',
							require_approval: 'never',
						},
					],
				},
			},
		} as never);

		expect(result.status).toBe('ok');
		expect(JSON.parse(result.content[0].text)).toEqual([
			{
				type: 'mcp',
				server_label: 'acme',
				server_url: 'https://mcp.example.com/sse',
				authorization: 'mcp-token',
				require_approval: 'never',
			},
		]);
	});

	it('reports a missing connector tools service', async () => {
		const result = await openAiConnectorToolsTool.execute({}, { services: {} } as never);

		expect(result.status).toBe('error');
		expect(result.content[0].text).toContain('connector tools service is not configured');
	});
});
