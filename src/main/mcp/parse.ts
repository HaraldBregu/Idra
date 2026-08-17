import type { McpDocument, McpServer } from './types';

export function parseMcp(value: unknown): McpDocument {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('MCP configuration is invalid.');
	}
	const parsed = value as { servers?: unknown };
	if (!Array.isArray(parsed.servers)) throw new Error('MCP configuration is invalid.');
	const servers = parsed.servers.map((value): McpServer => {
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			throw new Error('MCP server is invalid.');
		}
		const server = value as Record<string, unknown>;
		if (
			typeof server.id !== 'string' ||
			!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(server.id) ||
			typeof server.enabled !== 'boolean'
		) {
			throw new Error('MCP server is invalid.');
		}
		if (server.transport === 'stdio') {
			if (
				typeof server.command !== 'string' ||
				server.command.length === 0 ||
				!Array.isArray(server.args) ||
				!server.args.every((arg) => typeof arg === 'string')
			) {
				throw new Error('MCP stdio server is invalid.');
			}
			return {
				id: server.id,
				transport: 'stdio',
				command: server.command,
				args: server.args,
				enabled: server.enabled,
			};
		}
		if (server.transport === 'http') {
			if (typeof server.url !== 'string' || !/^https?:\/\//.test(server.url)) {
				throw new Error('MCP HTTP server URL is invalid.');
			}
			const headers = server.headers;
			if (
				headers !== undefined &&
				(!headers ||
					typeof headers !== 'object' ||
					Array.isArray(headers) ||
					!Object.values(headers).every((header) => typeof header === 'string'))
			) {
				throw new Error('MCP HTTP server headers are invalid.');
			}
			return {
				id: server.id,
				transport: 'http',
				url: server.url,
				...(headers ? { headers: headers as Record<string, string> } : {}),
				enabled: server.enabled,
			};
		}
		throw new Error('MCP transport must be stdio or http.');
	});
	if (new Set(servers.map((server) => server.id)).size !== servers.length) {
		throw new Error('MCP server IDs must be unique.');
	}
	return { servers };
}
