import { cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import type { McpLocalImportResult } from '../../shared/mcp_types';
import { readLocalMcpServer } from './mcp_local_read';
import { mcpLocalRoot } from './mcp_local_root';

export function importLocalMcpServers(
	sources: readonly string[],
	root = mcpLocalRoot()
): McpLocalImportResult {
	mkdirSync(root, { recursive: true });
	const imported: McpLocalImportResult['imported'][number][] = [];
	const skipped: McpLocalImportResult['skipped'][number][] = [];
	for (const source of sources) {
		let temporary: string | undefined;
		try {
			const server = readLocalMcpServer(source);
			const destination = path.join(root, server.id);
			if (existsSync(destination)) {
				throw new Error(`A local MCP server with ID "${server.id}" already exists.`);
			}
			temporary = mkdtempSync(path.join(root, '.import-'));
			cpSync(source, temporary, { recursive: true, force: false, errorOnExist: true });
			renameSync(temporary, destination);
			temporary = undefined;
			imported.push(readLocalMcpServer(destination));
		} catch (error) {
			if (temporary) rmSync(temporary, { recursive: true, force: true });
			skipped.push({
				name: path.basename(source),
				path: source,
				reason: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return { imported, skipped };
}
