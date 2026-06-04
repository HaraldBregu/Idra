import { createAgentTools, ToolService } from '../../../../src/main/tools';

describe('tool registry organization', () => {
	it('exposes run-scoped filesystem tools by default', async () => {
		const result = await createAgentTools({
			workspaceDir: process.cwd(),
		});

		try {
			const names = result.tools.map((tool) => tool.name);
			expect(names).toContain('read');
			expect(names).toContain('edit');
			expect(names).toContain('write');
		} finally {
			await result.dispose();
		}
	});

	it('exposes filesystem tools in the default local catalog', () => {
		const names = new ToolService().createDefaultTools({}).map((tool) => tool.name);

		expect(names).toContain('read');
		expect(names).toContain('edit');
		expect(names).toContain('write');
	});

	it('can expose only read by allowlist', async () => {
		const result = await createAgentTools({
			workspaceDir: process.cwd(),
			toolsAllow: ['read'],
		});

		try {
			expect(result.tools.map((tool) => tool.name)).toEqual(['read']);
		} finally {
			await result.dispose();
		}
	});

	it.each(['exec', 'cron_create'])(
		'resolves %s by allowlist',
		async (toolName) => {
			const result = await createAgentTools({
				workspaceDir: process.cwd(),
				toolsAllow: [toolName],
			});

			try {
				expect(result.tools.map((tool) => tool.name)).toContain(toolName);
			} finally {
				await result.dispose();
			}
		}
	);

	it('does not expose local MCP tools by allowlist', async () => {
		const result = await createAgentTools({
			workspaceDir: process.cwd(),
			toolsAllow: ['mcp_list_servers'],
		});

		try {
			expect(result.tools.map((tool) => tool.name)).toEqual([]);
		} finally {
			await result.dispose();
		}
	});

	it('does not expose provider connector specs as local tools', async () => {
		const result = await createAgentTools({
			workspaceDir: process.cwd(),
			toolsAllow: ['openai_connector_tools'],
		});

		try {
			expect(result.tools.map((tool) => tool.name)).toEqual([]);
		} finally {
			await result.dispose();
		}
	});

	it('returns no provider built-in tools without connector tools', () => {
		const service = new ToolService();

		expect(service.createBuiltInToolsForProvider('openai')).toEqual([]);
	});

	it('converts configured remote MCP connectors into OpenAI MCP built-in tools', () => {
		const service = new ToolService({
			connectors: {
				listStored: () => [
					{
						id: 'stripe',
						name: 'Stripe',
						connectorId: 'stripe',
						serverLabel: 'stripe',
						serverDescription: 'Stripe remote MCP server.',
						serverUrl: 'https://mcp.stripe.com',
						enabled: true,
						authorization: 'stripe-token',
						requireApproval: 'always',
						allowedTools: [],
						deferLoading: false,
						tools: [],
						createdAt: '2026-01-01T00:00:00.000Z',
						updatedAt: '2026-01-01T00:00:00.000Z',
					},
					{
						id: 'public',
						name: 'Public MCP',
						connectorId: 'public',
						serverLabel: 'public',
						serverUrl: 'https://mcp.example.com/mcp',
						enabled: true,
						authorization: '',
						requireApproval: 'never_for_allowed_tools',
						allowedTools: ['search'],
						deferLoading: true,
						tools: [],
						createdAt: '2026-01-01T00:00:00.000Z',
						updatedAt: '2026-01-01T00:00:00.000Z',
					},
					{
						id: 'gmail',
						name: 'Gmail',
						connectorId: 'connector_gmail',
						serverLabel: 'gmail',
						serverUrl: 'https://gmailmcp.googleapis.com/mcp/v1',
						enabled: true,
						authorization: 'gmail-token',
						requireApproval: 'always',
						allowedTools: [],
						deferLoading: false,
						tools: [],
						createdAt: '2026-01-01T00:00:00.000Z',
						updatedAt: '2026-01-01T00:00:00.000Z',
					},
					{
						id: 'disabled',
						name: 'Disabled',
						connectorId: 'disabled',
						serverLabel: 'disabled',
						serverUrl: 'https://mcp.disabled.example.com/mcp',
						enabled: false,
						authorization: '',
						requireApproval: 'never',
						allowedTools: [],
						deferLoading: false,
						tools: [],
						createdAt: '2026-01-01T00:00:00.000Z',
						updatedAt: '2026-01-01T00:00:00.000Z',
					},
					{
						id: 'openai-connector',
						name: 'Gmail',
						connectorId: 'connector_gmail',
						serverLabel: 'gmail',
						enabled: true,
						authorization: 'gmail-token',
						requireApproval: 'never',
						allowedTools: [],
						deferLoading: false,
						tools: [],
						createdAt: '2026-01-01T00:00:00.000Z',
						updatedAt: '2026-01-01T00:00:00.000Z',
					},
				],
			} as never,
		});

		expect(service.createBuiltInToolsForProvider('openai')).toEqual([
			{
				type: 'mcp',
				server_label: 'stripe',
				server_url: 'https://mcp.stripe.com',
				require_approval: 'always',
				server_description: 'Stripe remote MCP server.',
				authorization: 'stripe-token',
			},
			{
				type: 'mcp',
				server_label: 'public',
				server_url: 'https://mcp.example.com/mcp',
				require_approval: { never: { tool_names: ['search'] } },
				allowed_tools: ['search'],
				defer_loading: true,
			},
			{
				type: 'mcp',
				server_label: 'gmail',
				server_url: 'https://gmailmcp.googleapis.com/mcp/v1',
				require_approval: {
					never: {
						tool_names: [
							'get_profile',
							'search_threads',
							'read_thread',
							'get_thread',
							'search_emails',
							'search_email_ids',
							'get_recent_emails',
							'read_email',
							'batch_read_email',
						],
					},
				},
				authorization: 'gmail-token',
				allowed_tools: [
					'get_profile',
					'search_threads',
					'read_thread',
					'get_thread',
					'search_emails',
					'search_email_ids',
					'get_recent_emails',
					'read_email',
					'batch_read_email',
				],
			},
		]);
		expect(service.createBuiltInToolsForProvider('anthropic')).toEqual([]);
	});
});
