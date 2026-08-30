import Fastify, { type FastifyInstance } from 'fastify';
import { userDataLocation } from '../shared/user_data_location';
import { ConfigurationStore } from '../config/store';
import { registerConfigurationRoutes } from '../config/routes';
import { OAuthIssuer } from '../oauth/issuer';
import { RequestLimiter } from '../oauth/limit';
import { registerOAuthRoutes } from '../oauth/routes';
import type { AgentPort } from './executor';
import { registerA2aRoutes } from './routes';
import { resolveSecureA2aConfig } from './secure_config';

interface A2aServerOptions {
	adminToken?: string | null;
	configurationKey?: string | null;
	dataDirectory?: string;
	publicUrl?: string | null;
}

export async function createA2aServer(
	agent: AgentPort,
	options: A2aServerOptions = {}
): Promise<FastifyInstance> {
	const config = resolveSecureA2aConfig({
		adminToken: options.adminToken,
		configurationKey: options.configurationKey,
		dataDirectory: options.dataDirectory ?? userDataLocation(),
		publicUrl: options.publicUrl,
	});
	const server = Fastify({
		bodyLimit: 100 * 1024,
		logger: {
			redact: ['req.headers.authorization', 'req.body.apiKey', 'req.body.client_assertion'],
		},
	});
	const store = new ConfigurationStore(config.dataDirectory, config.encryptionKey);
	const issuer = new OAuthIssuer(store, config.publicUrl);
	const limiter = new RequestLimiter();
	registerOAuthRoutes(server, issuer);
	registerConfigurationRoutes(server, store, config.adminToken, issuer, limiter);
	await registerA2aRoutes(
		server,
		agent,
		{
			token: '',
			publicUrl: config.publicUrl,
			tasksDirectory: config.tasksDirectory,
			workspaceDirectory: config.workspaceDirectory,
		},
		issuer
	);
	return server;
}
