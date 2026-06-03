import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { jsonText } from '../shared/mcp-json-text';
import { mcpConnectors } from '../shared/mcp-connectors';
import { missing } from '../shared/mcp-missing';

export const mcpReadResourceTool: AgentTool<{ id: string; uri: string; options?: Record<string, unknown> }> = {
	name: 'mcp_read_resource',
	description: 'Read a resource from a configured MCP server.',
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
		if (!connectors) return missing('mcp_read_resource');
		try {
			return jsonText(await connectors.readResource(args.id, args.uri, args.options));
		} catch (error) {
			return textResult(`mcp_read_resource: ${(error as Error).message}`, true);
		}
	},
};
