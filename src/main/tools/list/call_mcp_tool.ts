import type { AgentTool } from '../../base/tool';
import { textResult } from '../../base/tool';
import { toolDescription } from '../../base/metadata';
import { jsonText } from './json-text';
import { mcpConnectors } from './mcp_connectors';
import { missing } from './missing';

export const callMcpToolTool: AgentTool<{
	id: string;
	name: string;
	args?: Record<string, unknown>;
	options?: Record<string, unknown>;
}> = {
	name: 'call_mcp_tool',
	description: toolDescription('call_mcp_tool'),
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
		if (!connectors) return missing('call_mcp_tool');
		try {
			return jsonText(await connectors.callTool(args.id, args.name, args.args ?? {}, args.options));
		} catch (error) {
			return textResult(`call_mcp_tool: ${(error as Error).message}`, true);
		}
	},
};
