import { createAgentTools, ToolService } from '../../../../src/main/tools';

describe('tool registry organization', () => {
	it('uses workspace as the default run-scoped filesystem surface', async () => {
		const result = await createAgentTools({
			workspaceDir: process.cwd(),
		});

		try {
			const names = result.tools.map((tool) => tool.name);
			expect(names).toContain('workspace');
			expect(names).not.toContain('file_read');
			expect(names).not.toContain('file_edit');
			expect(names).not.toContain('file_write');
			expect(names).not.toContain('file_delete');
		} finally {
			await result.dispose();
		}
	});

	it('uses workspace as the default local catalog filesystem surface', () => {
		const names = new ToolService().createDefaultTools({}).map((tool) => tool.name);

		expect(names).toContain('workspace');
		expect(names).not.toContain('file_read');
		expect(names).not.toContain('file_edit');
		expect(names).not.toContain('file_write');
		expect(names).not.toContain('file_delete');
	});

	it('can expose only workspace by allowlist', async () => {
		const result = await createAgentTools({
			workspaceDir: process.cwd(),
			toolsAllow: ['workspace'],
		});

		try {
			expect(result.tools.map((tool) => tool.name)).toEqual(['workspace']);
		} finally {
			await result.dispose();
		}
	});

	it.each(['exec', 'mcp_list_servers', 'script_run', 'cron_create'])(
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
