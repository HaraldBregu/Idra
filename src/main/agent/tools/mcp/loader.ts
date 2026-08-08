import { close, connect, getMcpServers, listTools, type McpClient } from '../../../mcp';
import type { JSONSchema, Tool } from '../../types';
import { MCP_MAX_TOOLS } from './limits';
import { mcpToolName } from './name';
import { mcpTool } from './tool';

export async function loadMcpTools(): Promise<{ tools: Tool[]; close: () => Promise<void> }> {
	const tools: Tool[] = [];
	const clients: McpClient[] = [];
	const usedNames = new Set<string>();

	for (const [id, data] of Object.entries(getMcpServers()).sort(([left], [right]) =>
		left.localeCompare(right)
	)) {
		if (tools.length >= MCP_MAX_TOOLS) break;
		if (data.enabled === false) continue;
		try {
			const client = await connect(id, data, 30_000);
			clients.push(client);
			const listed = await listTools(client, 30_000);
			for (const listedTool of listed.tools) {
				if (tools.length >= MCP_MAX_TOOLS) break;
				try {
					const runtimeName = mcpToolName(id, listedTool.name, usedNames);
					tools.push(
						mcpTool(
							client,
							listedTool.name,
							listedTool.description ?? '',
							listedTool.inputSchema as JSONSchema,
							id,
							data.require_approval,
							runtimeName
						)
					);
					usedNames.add(runtimeName);
				} catch {
					continue;
				}
			}
		} catch {
			continue;
		}
	}

	return {
		tools,
		close: async () => {
			await Promise.all(clients.map((c) => close(c).catch(() => {})));
		},
	};
}
