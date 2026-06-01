import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { toolDescription } from '../metadata';
import { idSchema } from './id-schema';
import { jsonText } from './json-text';
import { mcpConnectors } from './mcp-connectors';
import { missing } from './missing';

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
