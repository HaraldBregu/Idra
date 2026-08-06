import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { McpServerInfo, McpStdioData } from '../../shared/mcp_types';
import { listLocalMcpServers } from './mcp_local_list';
import { readLocalMcpServer } from './mcp_local_read';
import { mcpLocalRoot } from './mcp_local_root';

export function configureLocalMcpServer(
	id: string,
	input: McpStdioData,
	root = mcpLocalRoot()
): McpServerInfo {
	const serverId = id.trim().toLowerCase();
	if (!serverId) throw new Error('Connector ID is required.');
	if (!input || input.type !== 'stdio')
		throw new Error('Local MCP servers require stdio configuration.');
	if (typeof input.command !== 'string' || !input.command.trim()) {
		throw new Error('A non-empty command is required.');
	}
	if (
		input.args !== undefined &&
		(!Array.isArray(input.args) || input.args.some((item) => typeof item !== 'string'))
	) {
		throw new Error('Arguments must be an array of strings.');
	}
	if (
		input.env !== undefined &&
		(!input.env ||
			typeof input.env !== 'object' ||
			Array.isArray(input.env) ||
			Object.values(input.env).some((item) => typeof item !== 'string'))
	) {
		throw new Error('Environment variables must be a string-to-string object.');
	}
	if (input.cwd !== undefined && typeof input.cwd !== 'string') {
		throw new Error('cwd must be a string.');
	}
	if (
		input.require_approval !== undefined &&
		input.require_approval !== 'always' &&
		input.require_approval !== 'never'
	) {
		throw new Error('require_approval must be "always" or "never".');
	}
	if (input.defer_loading !== undefined && typeof input.defer_loading !== 'boolean') {
		throw new Error('defer_loading must be a boolean.');
	}
	if (input.enabled !== undefined && typeof input.enabled !== 'boolean') {
		throw new Error('enabled must be a boolean.');
	}

	const server = listLocalMcpServers(root).servers.find((entry) => entry.id === serverId);
	if (!server?.path) throw new Error(`No local MCP server "${id}".`);

	const manifestPath = path.join(server.path, 'mcp.json');
	const temporaryPath = path.join(server.path, `.mcp-${randomUUID()}.json`);
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
	const next = {
		...manifest,
		name: input.name?.trim() || undefined,
		command: input.command.trim(),
		args: input.args ? [...input.args] : undefined,
		env: input.env ? { ...input.env } : undefined,
		cwd:
			input.cwd === server.data.cwd
				? manifest.cwd
				: input.cwd?.trim() || undefined,
		require_approval: input.require_approval,
		defer_loading: input.defer_loading,
		enabled: input.enabled,
	};

	try {
		writeFileSync(temporaryPath, `${JSON.stringify(next, null, '\t')}\n`, 'utf8');
		renameSync(temporaryPath, manifestPath);
	} finally {
		if (existsSync(temporaryPath)) rmSync(temporaryPath);
	}

	return readLocalMcpServer(server.path);
}
