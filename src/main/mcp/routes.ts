import type { FastifyInstance } from 'fastify';
import type { AgentPort } from '../a2a/executor';
import type { AdminAuthentication } from '../admin/types';
import { parseMcp } from './parse';
import { readMcp } from './read';
import { writeMcp } from './write';

export function registerMcpRoutes(
	server: FastifyInstance,
	dataDirectory: string,
	authenticate: AdminAuthentication,
	agent: AgentPort
): void {
	server.get('/mcp', { onRequest: authenticate }, async () => readMcp(dataDirectory));
	server.put<{ Body: unknown }>(
		'/mcp',
		{
			onRequest: authenticate,
			schema: {
				body: {
					type: 'object',
					required: ['servers'],
					additionalProperties: false,
					properties: { servers: { type: 'array', maxItems: 32 } },
				},
			},
		},
		async (request) => {
			const document = parseMcp(request.body);
			writeMcp(dataDirectory, document);
			agent.configureMcp?.(document.servers);
			return document;
		}
	);
}
