import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AgentSendOptions } from '../agent/agent';
import type { AgentResponseEvent } from '../shared/agent_types';
import { userDataLocation } from '../shared/user_data_location';
import { registerStorageRoutes } from './storage/routes';

interface AgentPort {
	send(message: string, agentId: string, options: AgentSendOptions): Promise<string>;
	cancel(runId: string): boolean;
}

interface AgentRequest {
	message: string;
	sessionId?: string;
}

interface ServerOptions {
	dataDirectory?: string;
	storageApiEnabled?: boolean;
}

export async function createApiServer(
	agent: AgentPort,
	options: ServerOptions = {}
): Promise<FastifyInstance> {
	const server = Fastify({ logger: true });

	server.get('/', async () => ({ test: true }));
	server.get('/health', async () => ({ status: 'ok' }));
	const storageApiEnabled =
		options.storageApiEnabled ??
		process.env.IDRA_STORAGE_API_ENABLED?.trim().toLowerCase() === 'true';
	if (storageApiEnabled) {
		registerStorageRoutes(server, options.dataDirectory ?? userDataLocation());
	}

	server.post<{ Body: AgentRequest }>('/agents/messages', {
		schema: {
			body: {
				type: 'object',
				required: ['message'],
				additionalProperties: false,
				properties: {
					message: { type: 'string', minLength: 1 },
					sessionId: { type: 'string', minLength: 1 },
				},
			},
		},
	}, async (request, reply) => {
		const runId = randomUUID();
		let completed = false;

		request.raw.once('close', () => {
			if (!completed) agent.cancel(runId);
		});

		reply.hijack();
		reply.raw.writeHead(200, {
			'cache-control': 'no-cache, no-transform',
			'content-type': 'application/x-ndjson; charset=utf-8',
			'x-accel-buffering': 'no',
		});
		reply.raw.flushHeaders();

		const write = (event: AgentResponseEvent | { type: 'error'; message: string }): void => {
			if (!reply.raw.destroyed) reply.raw.write(`${JSON.stringify(event)}\n`);
		};

		try {
			await agent.send(request.body.message, 'main', {
				type: 'default',
				runId,
				...(request.body.sessionId ? { sessionId: request.body.sessionId } : {}),
				streaming: true,
				contextMode: 'workspace',
				interactionMode: 'default',
				streamEvent: write,
			});
		} catch (error) {
			write({ type: 'error', message: error instanceof Error ? error.message : String(error) });
		} finally {
			completed = true;
			reply.raw.end();
		}
	});

	return server;
}
