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

	it('returns no provider built-in tools without connector tools', () => {
		const service = new ToolService();

		expect(service.createBuiltInToolsForProvider('openai')).toEqual([]);
	});
});
