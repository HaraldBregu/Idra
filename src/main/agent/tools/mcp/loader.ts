import { close, connect, getMcpServers, listTools, type McpClient } from '../../../mcp';
import type { JSONSchema, Tool } from '../../types';
import { mcpTool } from './tool';

export async function loadMcpTools(): Promise<{ tools: Tool[]; close: () => Promise<void> }> {
	const tools: Tool[] = [];
	const clients: McpClient[] = [];

	await Promise.all(
		Object.entries(getMcpServers()).map(async ([id, data]) => {
			if (data.enabled === false) return;
			try {
				const client = await connect(id, data, 30_000);
				clients.push(client);
				const listed = await listTools(client, 30_000);
				for (const t of listed.tools) {
					tools.push(
						mcpTool(
							client,
							t.name,
							t.description ?? '',
							t.inputSchema as JSONSchema,
							id,
							data.require_approval
						)
					);
				}
			} catch {
				// ponytail: skip servers that fail to connect (offline / needs OAuth); they contribute no tools
			}
		})
	);

	return {
		tools,
		close: async () => {
			await Promise.all(clients.map((c) => close(c).catch(() => {})));
		},
	};
}
