import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { idSchema } from './shared/mcp-id-schema';
import { jsonText } from './shared/mcp-json-text';
import { mcpConnectors } from './shared/mcp-connectors';
import { missing } from './shared/mcp-missing';

export const mcpListToolsTool: AgentTool<{ id: string }> = {
	name: 'mcp_list_tools',
	description: 'List tools exposed by a configured MCP server.',
	schema: idSchema,
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('mcp_list_tools');
		try {
			return jsonText(connectors.listTools(args.id));
		} catch (error) {
			return textResult(`mcp_list_tools: ${(error as Error).message}`, true);
		}
	},
};
