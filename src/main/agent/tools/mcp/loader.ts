import type { McpClient } from '../../mcp/mcp-types';
import type { Tool } from '../../types';
import type { JSONSchema } from '../../types';
import { getMcpServers } from '../../mcp/mcp-store';
import { close } from '../../mcp/mcp-client-close';
import { connect } from '../../mcp/mcp-client-connect';
import { listTools } from '../../mcp/mcp-client-list-tools';
import { mcpTool } from './tool';

export async function loadMcpTools(): Promise<{ tools: Tool[]; close: () => Promise<void> }> {
	const tools: Tool[] = [];
	const clients: Client[] = [];

	await Promise.all(
		Object.entries(getMcpServers()).map(async ([id, data]) => {
			if (data.enabled === false) return;
			try {
				const client = await connect(id, data);
				clients.push(client);
				const listed = await listTools(client);
				for (const t of listed.tools) {
					tools.push(
						mcpTool(client, t.name, t.description ?? '', t.inputSchema as JSONSchema, id),
					);
				}
			} catch {
				// ponytail: skip servers that fail to connect (offline / needs OAuth); they contribute no tools
			}
		}),
	);

	return {
		tools,
		close: async () => {
			await Promise.all(clients.map((c) => close(c).catch(() => {})));
		},
	};
}
