import fastifyExpress from '@fastify/express';
import { AgentCard as A2aAgentCard } from '@a2a-js/sdk';
import { DefaultRequestHandler } from '@a2a-js/sdk/server';
import { UserBuilder, restHandler } from '@a2a-js/sdk/server/express';
import { Router } from 'express';
import type { FastifyInstance } from 'fastify';
import { allowA2aOperations } from './allowed';
import { createBearerAuthentication } from './auth';
import { createAgentCard } from './card';
import type { A2aConfig } from './config';
import { IdraExecutor, type AgentPort } from './executor';
import { createTaskStore } from './store';

export async function registerA2aRoutes(
	server: FastifyInstance,
	agent: AgentPort,
	config: A2aConfig
): Promise<void> {
	await server.register(fastifyExpress);
	const card = createAgentCard(config.publicUrl);
	const taskStore = await createTaskStore(config.tasksDirectory);
	const handler = new DefaultRequestHandler(
		card,
		taskStore,
		new IdraExecutor(agent, config.workspaceDirectory)
	);

	server.get('/.well-known/agent-card.json', async (_request, reply) => {
		return reply.send(A2aAgentCard.toJSON(card));
	});

	const router = Router();
	router.use(allowA2aOperations());
	router.use(createBearerAuthentication(config.token));
	router.use(
		restHandler({
			requestHandler: handler,
			userBuilder: UserBuilder.noAuthentication,
		})
	);
	server.use('/a2a', router);
}
