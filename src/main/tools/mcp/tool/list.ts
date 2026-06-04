import type { AgentTool } from '../../core/tool';
import { textResult } from '../../core/tool';
import { idSchema } from '../shared/id-schema';
import { jsonText } from '../../shared/json-text';
import { mcpConnectors } from '../shared/connectors';
import { missing } from '../shared/missing';

export const mcpListToolsTool: AgentTool<{ id: string }> = {
	name: 'mcp_list_tools',
	description: 'List tools exposed by a configured MCP server.',
	schema: idSchema,
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('mcp_list_tools');
		try {
			return jsonText(await connectors.listTools(args.id));
		} catch (error) {
			return textResult(`mcp_list_tools: ${(error as Error).message}`, true);
		}
	},
};
