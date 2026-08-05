import { existsSync, readdirSync } from 'node:fs';
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
		const directory = `${root}/${entry.name}`;
		try {
			servers.push(readLocalMcpServer(directory));
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
