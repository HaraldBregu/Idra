import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { jsonText } from './shared/mcp-json-text';
import { mcpConnectors } from './shared/mcp-connectors';
import { missing } from './shared/mcp-missing';
import { optionsSchema } from './shared/mcp-options-schema';

export const mcpListPromptsTool: AgentTool<{ id: string; options?: Record<string, unknown> }> = {
	name: 'mcp_list_prompts',
	description: 'List prompts exposed by a configured MCP server.',
	schema: optionsSchema,
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('mcp_list_prompts');
		try {
			return jsonText(await connectors.listPrompts(args.id, args.options));
		} catch (error) {
			return textResult(`mcp_list_prompts: ${(error as Error).message}`, true);
		}
	},
};
