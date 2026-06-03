import type { AgentTool } from '../../base/tool';
import { emptySchema } from '../shared/empty-schema';
import { jsonText } from '../../shared/json-text';
import { mcpConnectors } from '../shared/connectors';
import { missing } from '../shared/missing';

export const mcpListServersTool: AgentTool = {
	name: 'mcp_list_servers',
	description: 'List configured MCP connector servers.',
	schema: emptySchema,
	async execute(_args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('mcp_list_servers');
		return jsonText(connectors.list().filter((server) => server.authKind === 'mcp_env'));
	},
};
