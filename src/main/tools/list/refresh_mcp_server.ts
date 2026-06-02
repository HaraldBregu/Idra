import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { toolDescription } from '../base/metadata';
import { idSchema } from './mcp_id_schema';
import { jsonText } from './mcp_json_text';
import { mcpConnectors } from './mcp_connectors';
import { missing } from './mcp_missing';

export const refreshMcpServerTool: AgentTool<{ id: string }> = {
	name: 'refresh_mcp_server',
	description: toolDescription('refresh_mcp_server'),
	schema: idSchema,
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('refresh_mcp_server');
		try {
			return jsonText(await connectors.refreshTools(args.id));
		} catch (error) {
			return textResult(`refresh_mcp_server: ${(error as Error).message}`, true);
		}
	},
};
