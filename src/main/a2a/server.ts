import Fastify, { type FastifyInstance } from 'fastify';
import { userDataLocation } from '../shared/user_data_location';
import { resolveA2aConfig } from './config';
import type { AgentPort } from './executor';
import { registerA2aRoutes } from './routes';

interface A2aServerOptions {
	agentToken?: string | null;
	dataDirectory?: string;
	publicUrl?: string | null;
}

export async function createA2aServer(
	agent: AgentPort,
	options: A2aServerOptions = {}
): Promise<FastifyInstance> {
	const config = resolveA2aConfig({
		dataDirectory: options.dataDirectory ?? userDataLocation(),
		token: options.agentToken,
		publicUrl: options.publicUrl,
	});
	if (!config) {
		throw new Error('A2A server requires IDRA_AGENT_TOKEN and IDRA_PUBLIC_URL.');
	}

	const server = Fastify({ logger: { redact: ['req.headers.authorization'] } });
	await registerA2aRoutes(server, agent, config);
	return server;
}
