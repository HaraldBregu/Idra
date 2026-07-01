import type { Tool } from '../../types';
import type { JSONSchema } from '../../types';
import { getMcpServers } from '../../mcp/mcp-store';
import { McpClient } from '../../mcp/client';
import { mcpTool } from './tool';

export async function loadMcpTools(): Promise<{ tools: Tool[]; close: () => Promise<void> }> {
	const tools: Tool[] = [];
	const clients: McpClient[] = [];

	await Promise.all(
		Object.entries(getMcpServers()).map(async ([id, data]) => {
			if (data.enabled === false) return;
			try {
				const client = new McpClient(id, data);
				await client.connect();
				clients.push(client);
				const listed = await client.listTools();
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
			await Promise.all(clients.map((c) => c.close().catch(() => {})));
		},
	};
}
