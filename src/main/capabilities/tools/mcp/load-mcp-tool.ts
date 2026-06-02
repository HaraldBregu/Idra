import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { toolDescription } from '../metadata';
import { jsonText } from './json-text';
import { mcpConnectors } from './mcp-connectors';
import { missing } from './missing';
import { namedSchema } from './named-schema';

export const loadMcpToolTool: AgentTool<{ id: string; name: string }> = {
	name: 'load_mcp_tool',
	description: toolDescription('load_mcp_tool'),
	schema: namedSchema('MCP tool name.'),
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('load_mcp_tool');
		try {
			const tools = connectors.listTools(args.id);
			if (!Array.isArray(tools)) return textResult('load_mcp_tool: tool list is unavailable.', true);
			const tool = tools.find((entry) => entry && typeof entry === 'object' && (entry as { name?: unknown }).name === args.name);
			return tool ? jsonText(tool) : textResult(`load_mcp_tool: tool not found: ${args.name}`, true);
		} catch (error) {
			return textResult(`load_mcp_tool: ${(error as Error).message}`, true);
		}
	},
};
