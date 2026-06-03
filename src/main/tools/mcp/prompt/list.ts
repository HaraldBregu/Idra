import type { AgentTool } from '../../core/tool';
import { textResult } from '../../core/tool';
import { jsonText } from '../../shared/json-text';
import { mcpConnectors } from '../shared/connectors';
import { missing } from '../shared/missing';
import { optionsSchema } from '../shared/options-schema';

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
