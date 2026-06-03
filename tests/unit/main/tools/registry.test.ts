import { createAgentTools } from '../../../../src/main/tools';

describe('tool registry organization', () => {
	it.each(['file_delete', 'exec', 'mcp_list_servers', 'script_run', 'cron_create'])(
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
