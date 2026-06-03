import type { AgentTool } from '../../core/tool';
import { textResult } from '../../core/tool';
import { idSchema } from '../shared/id-schema';
import { jsonText } from '../../shared/json-text';
import { mcpConnectors } from '../shared/connectors';
import { missing } from '../shared/missing';

export const mcpConnectServerTool: AgentTool<{ id: string }> = {
	name: 'mcp_connect_server',
	description: 'Connect to or test a configured MCP server.',
	schema: idSchema,
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('mcp_connect_server');
		try {
			return jsonText(await connectors.reconnect(args.id));
		} catch (error) {
			return textResult(`mcp_connect_server: ${(error as Error).message}`, true);
		}
	},
};
