import type { AgentTool } from '../../base/tool';
import { textResult } from '../../base/tool';
import { toolDescription } from '../../base/metadata';
import { idSchema } from './id-schema';
import { jsonText } from './json-text';
import { mcpConnectors } from './mcp_connectors';
import { missing } from './missing';

export const listMcpToolsTool: AgentTool<{ id: string }> = {
	name: 'list_mcp_tools',
	description: toolDescription('list_mcp_tools'),
	schema: idSchema,
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('list_mcp_tools');
		try {
			return jsonText(connectors.listTools(args.id));
		} catch (error) {
			return textResult(`list_mcp_tools: ${(error as Error).message}`, true);
		}
	},
};
