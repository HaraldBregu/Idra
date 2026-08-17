import type { FastifyInstance } from 'fastify';
import type { AgentPort } from '../a2a/executor';
import type { AdminAuthentication } from '../admin/types';
import { readMcp } from './read';
import { MCP_PACKAGES, type McpPackage } from './types';
import { writeMcp } from './write';

interface McpBody {
	package: McpPackage;
	args: string[];
	enabled: boolean;
}

export function registerMcpRoutes(
	server: FastifyInstance,
	dataDirectory: string,
	authenticate: AdminAuthentication,
	agent: AgentPort
): void {
	server.get('/mcp', { onRequest: authenticate }, async () => readMcp(dataDirectory));
	server.put<{ Params: { id: string }; Body: McpBody }>(
		'/mcp/:id',
		{
			onRequest: authenticate,
			schema: {
				params: {
					type: 'object',
					required: ['id'],
					properties: { id: { type: 'string', pattern: '^[a-z0-9][a-z0-9_-]{0,63}$' } },
				},
				body: {
					type: 'object',
					required: ['package', 'args', 'enabled'],
					additionalProperties: false,
					properties: {
						package: { type: 'string', enum: [...MCP_PACKAGES] },
						args: { type: 'array', maxItems: 32, items: { type: 'string', maxLength: 500 } },
						enabled: { type: 'boolean' },
					},
				},
			},
		},
		async (request) => {
			const current = readMcp(dataDirectory);
			const saved = { id: request.params.id, ...request.body };
			const servers = [...current.servers.filter((item) => item.id !== saved.id), saved];
			writeMcp(dataDirectory, { servers });
			agent.configureMcp?.(servers);
			return saved;
		}
	);
	server.delete<{ Params: { id: string } }>(
		'/mcp/:id',
		{ onRequest: authenticate },
		async (request) => {
			const servers = readMcp(dataDirectory).servers.filter(
				(item) => item.id !== request.params.id
			);
			writeMcp(dataDirectory, { servers });
			agent.configureMcp?.(servers);
			return { deleted: true };
		}
	);
}
