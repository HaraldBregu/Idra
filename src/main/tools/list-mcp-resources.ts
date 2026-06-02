import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { toolDescription } from './base/metadata';
import { jsonText } from './shared/mcp-json-text';
import { mcpConnectors } from './shared/mcp-connectors';
import { missing } from './shared/mcp-missing';
import { optionsSchema } from './shared/mcp-options-schema';

export const listMcpResourcesTool: AgentTool<{ id: string; options?: Record<string, unknown> }> = {
	name: 'list_mcp_resources',
	description: toolDescription('list_mcp_resources'),
	schema: optionsSchema,
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('list_mcp_resources');
		try {
			return jsonText(await connectors.listResources(args.id, args.options));
		} catch (error) {
			return textResult(`list_mcp_resources: ${(error as Error).message}`, true);
		}
	},
};
