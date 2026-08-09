import { close, connect, getMcpServers, listTools, type McpClient } from '../../../mcp';
import type { JSONSchema, McpDiscoveryDiagnostics, Tool } from '../../types';
import { MCP_MAX_TOOLS } from './limits';
import { mcpToolName } from './name';
import { mcpTool } from './tool';

export async function loadMcpTools(signal?: AbortSignal): Promise<{
	tools: Tool[];
	diagnostics: McpDiscoveryDiagnostics;
	close: () => Promise<void>;
}> {
	const tools: Tool[] = [];
	const clients: McpClient[] = [];
	const usedNames = new Set<string>();
	const servers = Object.entries(getMcpServers()).sort(([left], [right]) =>
		left.localeCompare(right)
	);
	const diagnostics: McpDiscoveryDiagnostics = {
		configuredServers: servers.length,
		enabledServers: servers.filter(([, data]) => data.enabled !== false).length,
		connectedServers: 0,
		listedTools: 0,
		loadedTools: 0,
		rejectedTools: 0,
		truncated: false,
		failures: [],
	};

	for (const [id, data] of servers) {
		signal?.throwIfAborted();
		if (data.enabled === false) continue;
		if (tools.length >= MCP_MAX_TOOLS) {
			diagnostics.truncated = true;
			diagnostics.failures.push({ serverId: id, phase: 'limit' });
			break;
		}
		let client: McpClient;
		try {
			client = await connect(id, data, 30_000, signal);
		} catch (error) {
			if (signal?.aborted) throw error;
			diagnostics.failures.push({ serverId: id, phase: 'connect' });
			continue;
		}
		clients.push(client);
		diagnostics.connectedServers += 1;
		let listed: Awaited<ReturnType<typeof listTools>>;
		try {
			listed = await listTools(client, 30_000, signal);
		} catch (error) {
			if (signal?.aborted) throw error;
			diagnostics.failures.push({ serverId: id, phase: 'list' });
			continue;
		}
		diagnostics.listedTools += listed.tools.length;
		for (const [index, listedTool] of listed.tools.entries()) {
			if (tools.length >= MCP_MAX_TOOLS) {
				diagnostics.truncated = true;
				diagnostics.rejectedTools += listed.tools.length - index;
				diagnostics.failures.push({ serverId: id, phase: 'limit' });
				break;
			}
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
				diagnostics.loadedTools += 1;
			} catch {
				diagnostics.rejectedTools += 1;
				diagnostics.failures.push({
					serverId: id,
					phase: 'schema',
					toolName: listedTool.name,
				});
			}
		}
	}

	return {
		tools,
		diagnostics,
		close: async () => {
			await Promise.all(clients.map((c) => close(c).catch(() => {})));
		},
	};
}
