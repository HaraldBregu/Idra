import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { jsonText } from './shared/mcp-json-text';
import { mcpConnectors } from './shared/mcp-connectors';
import { missing } from './shared/mcp-missing';
import { optionsSchema } from './shared/mcp-options-schema';

export const listMcpPromptsTool: AgentTool<{ id: string; options?: Record<string, unknown> }> = {
	name: 'list_mcp_prompts',
	description: 'List prompts exposed by a configured MCP server.',
	schema: optionsSchema,
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('list_mcp_prompts');
		try {
			return jsonText(await connectors.listPrompts(args.id, args.options));
		} catch (error) {
			return textResult(`list_mcp_prompts: ${(error as Error).message}`, true);
		}
	},
};
