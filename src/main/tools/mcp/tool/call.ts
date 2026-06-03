import type { AgentTool } from '../../core/tool';
import { textResult } from '../../core/tool';
import { jsonText } from '../../shared/json-text';
import { mcpConnectors } from '../shared/connectors';
import { missing } from '../shared/missing';

export const mcpCallToolTool: AgentTool<{
	id: string;
	name: string;
	args?: Record<string, unknown>;
	options?: Record<string, unknown>;
}> = {
	name: 'mcp_call_tool',
	description: 'Call a tool on a configured MCP server.',
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
	needsApproval: true,
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('mcp_call_tool');
		try {
			return jsonText(await connectors.callTool(args.id, args.name, args.args ?? {}, args.options));
		} catch (error) {
			return textResult(`mcp_call_tool: ${(error as Error).message}`, true);
		}
	},
};
