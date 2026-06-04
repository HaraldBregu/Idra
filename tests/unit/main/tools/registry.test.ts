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

	it.each(['exec', 'mcp_list_servers', 'cron_create'])(
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

	it('passes stored connector MCP specs as provider built-in tools', () => {
		const builtInTools = [{
			type: 'mcp' as const,
			server_label: 'dmcp',
			server_description: 'A Dungeons and Dragons MCP server to assist with dice rolling.',
			server_url: 'https://dmcp-server.deno.dev/sse',
			require_approval: 'never' as const,
			allowed_tools: ['roll'],
		}];
		const connectorTools = {
			createBuiltInConnectorTools: jest.fn(() => builtInTools),
		};
		const service = new ToolService({ connectorTools: connectorTools as never });

		expect(service.createBuiltInToolsForProvider('openai')).toEqual(builtInTools);
		expect(connectorTools.createBuiltInConnectorTools).toHaveBeenCalledWith('openai');
	});
});
