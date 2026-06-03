import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { jsonText } from '../shared/json-text';
import { mcpConnectors } from '../shared/mcp-connectors';
import { missing } from '../shared/mcp-missing';
import { optionsSchema } from '../shared/mcp-options-schema';

export const mcpListResourcesTool: AgentTool<{ id: string; options?: Record<string, unknown> }> = {
	name: 'mcp_list_resources',
	description: 'List resources exposed by a configured MCP server.',
	schema: optionsSchema,
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('mcp_list_resources');
		try {
			return jsonText(await connectors.listResources(args.id, args.options));
		} catch (error) {
			return textResult(`mcp_list_resources: ${(error as Error).message}`, true);
		}
	},
};
