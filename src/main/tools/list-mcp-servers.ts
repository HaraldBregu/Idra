import type { AgentTool } from './base/tool';
import { toolDescription } from './base/metadata';
import { emptySchema } from './mcp-empty-schema';
import { jsonText } from './mcp-json-text';
import { mcpConnectors } from './mcp-connectors';
import { missing } from './mcp-missing';

export const listMcpServersTool: AgentTool = {
	name: 'list_mcp_servers',
	description: toolDescription('list_mcp_servers'),
	schema: emptySchema,
	async execute(_args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('list_mcp_servers');
		return jsonText(connectors.list().filter((server) => server.authKind === 'mcp_env'));
	},
};
