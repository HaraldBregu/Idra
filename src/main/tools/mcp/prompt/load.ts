import type { AgentTool } from '../../core/tool';
import { textResult } from '../../core/tool';
import { jsonText } from '../../shared/json-text';
import { mcpConnectors } from '../shared/connectors';
import { missing } from '../shared/missing';

export const mcpLoadPromptTool: AgentTool<{
	id: string;
	name: string;
	args?: Record<string, unknown>;
	options?: Record<string, unknown>;
}> = {
	name: 'mcp_load_prompt',
	description: 'Load a prompt from a configured MCP server.',
	schema: {
		type: 'object',
		properties: {
			id: { type: 'string' },
			name: { type: 'string' },
			args: { type: 'object', additionalProperties: true },
			options: { type: 'object', additionalProperties: true },
		},
		required: ['id', 'name'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('mcp_load_prompt');
		try {
			return jsonText(await connectors.getPrompt(args.id, args.name, args.args ?? {}, args.options));
		} catch (error) {
			return textResult(`mcp_load_prompt: ${(error as Error).message}`, true);
		}
	},
};
