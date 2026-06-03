import type { AgentTool } from './base/tool';
import { emptySchema } from './shared/mcp-empty-schema';
import { jsonText } from './shared/mcp-json-text';
import { mcpConnectors } from './shared/mcp-connectors';
import { missing } from './shared/mcp-missing';

export const listMcpServersTool: AgentTool = {
	name: 'list_mcp_servers',
	description: 'List configured MCP connector servers.',
	schema: emptySchema,
	async execute(_args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('list_mcp_servers');
		return jsonText(connectors.list().filter((server) => server.authKind === 'mcp_env'));
	},
};
