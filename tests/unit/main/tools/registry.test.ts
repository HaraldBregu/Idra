import { createAgentTools, ToolService } from '../../../../src/main/tools';

describe('tool registry organization', () => {
	it('exposes run-scoped filesystem tools by default', async () => {
		const result = await createAgentTools({
			workspaceDir: process.cwd(),
		});

		try {
			const names = result.tools.map((tool) => tool.name);
			expect(names).toContain('file_read');
			expect(names).toContain('file_edit');
			expect(names).toContain('file_write');
			expect(names).toContain('file_delete');
		} finally {
			await result.dispose();
		}
	});

	it('exposes filesystem tools in the default local catalog', () => {
		const names = new ToolService().createDefaultTools({}).map((tool) => tool.name);

		expect(names).toContain('file_read');
		expect(names).toContain('file_edit');
		expect(names).toContain('file_write');
		expect(names).toContain('file_delete');
	});

	it('can expose only file_read by allowlist', async () => {
		const result = await createAgentTools({
			workspaceDir: process.cwd(),
			toolsAllow: ['file_read'],
		});

		try {
			expect(result.tools.map((tool) => tool.name)).toEqual(['file_read']);
		} finally {
			await result.dispose();
		}
	});

	it.each(['file_delete', 'bash', 'mcp_list_servers', 'script_run', 'cron_create'])(
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
});
