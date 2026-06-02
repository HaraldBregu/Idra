import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { toolDescription } from '../base/metadata';
import { jsonText } from './mcp_json_text';
import { mcpConnectors } from './mcp_connectors';
import { missing } from './mcp_missing';

export const loadMcpPromptTool: AgentTool<{
	id: string;
	name: string;
	args?: Record<string, unknown>;
	options?: Record<string, unknown>;
}> = {
	name: 'load_mcp_prompt',
	description: toolDescription('load_mcp_prompt'),
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
		if (!connectors) return missing('load_mcp_prompt');
		try {
			return jsonText(await connectors.getPrompt(args.id, args.name, args.args ?? {}, args.options));
		} catch (error) {
			return textResult(`load_mcp_prompt: ${(error as Error).message}`, true);
		}
	},
};
