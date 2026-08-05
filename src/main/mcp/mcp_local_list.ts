import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { McpRegistry } from '../../shared/mcp_types';
import { readLocalMcpServer } from './mcp_local_read';
import { mcpLocalRoot } from './mcp_local_root';

export function listLocalMcpServers(root = mcpLocalRoot()): McpRegistry {
	const servers: McpRegistry['servers'][number][] = [];
	const diagnostics: McpRegistry['diagnostics'][number][] = [];
	if (!existsSync(root)) return { servers, diagnostics };

	for (const entry of readdirSync(root, { withFileTypes: true }).sort((a, b) =>
		a.name.localeCompare(b.name)
	)) {
		if (!entry.isDirectory()) continue;
		const directory = path.join(root, entry.name);
		try {
			const server = readLocalMcpServer(directory);
			if (servers.some((current) => current.id === server.id)) {
				throw new Error(`Another local MCP server already uses ID "${server.id}".`);
			}
			servers.push(server);
		} catch (error) {
			diagnostics.push({
				name: entry.name,
				path: directory,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return { servers, diagnostics };
}
