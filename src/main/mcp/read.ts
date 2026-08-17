import fs from 'node:fs';
import { mcpPath } from './path';
import { MCP_PACKAGES, type McpDocument, type McpPackage, type McpServer } from './types';

export function readMcp(dataDirectory: string): McpDocument {
	const filePath = mcpPath(dataDirectory);
	if (!fs.existsSync(filePath)) return { servers: [] };
	if (fs.lstatSync(filePath).isSymbolicLink())
		throw new Error('MCP configuration cannot be a symbolic link.');
	const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { servers?: unknown };
	if (!Array.isArray(parsed.servers)) throw new Error('MCP configuration is invalid.');
	const servers = parsed.servers.map((value): McpServer => {
		if (!value || typeof value !== 'object' || Array.isArray(value))
			throw new Error('MCP server is invalid.');
		const server = value as Record<string, unknown>;
		if (
			typeof server.id !== 'string' ||
			!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(server.id) ||
			typeof server.package !== 'string' ||
			!MCP_PACKAGES.includes(server.package as McpPackage) ||
			!Array.isArray(server.args) ||
			!server.args.every((arg) => typeof arg === 'string') ||
			typeof server.enabled !== 'boolean'
		)
			throw new Error('MCP server is invalid.');
		return {
			id: server.id,
			package: server.package as McpPackage,
			args: server.args,
			enabled: server.enabled,
		};
	});
	return { servers };
}
