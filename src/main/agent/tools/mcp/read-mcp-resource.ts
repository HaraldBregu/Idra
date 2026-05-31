import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { toolDescription } from '../metadata';
import { jsonText } from './json-text';
import { mcpConnectors } from './mcp-connectors';
import { missing } from './missing';

export const readMcpResourceTool: AgentTool<{ id: string; uri: string; options?: Record<string, unknown> }> = {
	name: 'read_mcp_resource',
	description: toolDescription('read_mcp_resource'),
	schema: {
		type: 'object',
		properties: {
			id: { type: 'string' },
			uri: { type: 'string' },
			options: { type: 'object', additionalProperties: true },
		},
		required: ['id', 'uri'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('read_mcp_resource');
		try {
			return jsonText(await connectors.readResource(args.id, args.uri, args.options));
		} catch (error) {
			return textResult(`read_mcp_resource: ${(error as Error).message}`, true);
		}
	},
};
