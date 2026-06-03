import type { AgentTool } from '../../base/tool';
import { textResult } from '../../base/tool';
import { jsonText } from '../../shared/json-text';
import { mcpConnectors } from '../shared/connectors';
import { missing } from '../shared/missing';
import { namedSchema } from '../shared/named-schema';

export const mcpLoadToolTool: AgentTool<{ id: string; name: string }> = {
	name: 'mcp_load_tool',
	description: 'Load schema and metadata for one MCP tool.',
	schema: namedSchema('MCP tool name.'),
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('mcp_load_tool');
		try {
			const tools = connectors.listTools(args.id);
			if (!Array.isArray(tools)) return textResult('mcp_load_tool: tool list is unavailable.', true);
			const tool = tools.find((entry) => entry && typeof entry === 'object' && (entry as { name?: unknown }).name === args.name);
			return tool ? jsonText(tool) : textResult(`mcp_load_tool: tool not found: ${args.name}`, true);
		} catch (error) {
			return textResult(`mcp_load_tool: ${(error as Error).message}`, true);
		}
	},
};
