import type { AgentTool } from '../../base/tool';
import { textResult } from '../../base/tool';
import { toolDescription } from '../../base/metadata';
import { jsonText } from './json-text';
import { mcpConnectors } from './mcp_connectors';
import { missing } from './missing';
import { optionsSchema } from './options-schema';

export const listMcpPromptsTool: AgentTool<{ id: string; options?: Record<string, unknown> }> = {
	name: 'list_mcp_prompts',
	description: toolDescription('list_mcp_prompts'),
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
