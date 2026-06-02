import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { toolDescription } from './base/metadata';
import { idSchema } from './mcp-id-schema';
import { jsonText } from './mcp-json-text';
import { mcpConnectors } from './mcp-connectors';
import { missing } from './mcp-missing';

export const connectMcpServerTool: AgentTool<{ id: string }> = {
	name: 'connect_mcp_server',
	description: toolDescription('connect_mcp_server'),
	schema: idSchema,
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('connect_mcp_server');
		try {
			return jsonText(await connectors.reconnect(args.id));
		} catch (error) {
			return textResult(`connect_mcp_server: ${(error as Error).message}`, true);
		}
	},
};
