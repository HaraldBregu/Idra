import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { toolDescription } from '../base/metadata';
import { idSchema } from './internal/mcp-id-schema';
import { jsonText } from './internal/mcp-json-text';
import { mcpConnectors } from './internal/mcp-connectors';
import { missing } from './internal/mcp-missing';

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
