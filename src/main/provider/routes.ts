import type { FastifyInstance } from 'fastify';
import type { AdminAuthentication } from '../admin/types';
import { deleteProvider } from './delete';
import { ProviderError } from './error';
import { publicProvider } from './public';
import { readProvider } from './read';
import { writeProvider } from './write';
import type { ProviderId } from './types';

interface ProviderBody {
	provider: ProviderId;
	model: string;
	apiKey?: string;
}

export function registerProviderRoutes(
	server: FastifyInstance,
	dataDirectory: string,
	authenticate: AdminAuthentication
): void {
	server.get('/provider', { onRequest: authenticate }, async () =>
		publicProvider(readProvider(dataDirectory))
	);
	server.put<{ Body: ProviderBody }>(
		'/provider',
		{
			onRequest: authenticate,
			schema: {
				body: {
					type: 'object',
					required: ['provider', 'model'],
					additionalProperties: false,
					properties: {
						provider: { type: 'string', enum: ['anthropic', 'openai', 'deepseek'] },
						model: { type: 'string', minLength: 1, maxLength: 200 },
						apiKey: { type: 'string', minLength: 1, maxLength: 4096 },
					},
				},
			},
		},
		async (request, reply) => {
			const existing = readProvider(dataDirectory);
			const apiKey = request.body.apiKey?.trim();
			const preservedApiKey =
				existing?.provider === request.body.provider ? existing.apiKey : undefined;
			if (!apiKey && !preservedApiKey) {
				throw new ProviderError(400, 'An API key is required for this provider.');
			}
			writeProvider(dataDirectory, {
				provider: request.body.provider,
				model: request.body.model.trim(),
				apiKey: apiKey ?? preservedApiKey ?? '',
			});
			return reply.code(existing ? 200 : 201).send(publicProvider(readProvider(dataDirectory)));
		}
	);
	server.delete('/provider', { onRequest: authenticate }, async () => ({
		deleted: deleteProvider(dataDirectory),
	}));
}
