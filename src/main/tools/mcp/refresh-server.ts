import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { idSchema } from '../shared/mcp-id-schema';
import { jsonText } from '../shared/json-text';
import { mcpConnectors } from '../shared/mcp-connectors';
import { missing } from '../shared/mcp-missing';

export const mcpRefreshServerTool: AgentTool<{ id: string }> = {
	name: 'mcp_refresh_server',
	description: 'Refresh a configured MCP server and its discovered capabilities.',
	schema: idSchema,
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('mcp_refresh_server');
		try {
			return jsonText(await connectors.refreshTools(args.id));
		} catch (error) {
			return textResult(`mcp_refresh_server: ${(error as Error).message}`, true);
		}
	},
};
