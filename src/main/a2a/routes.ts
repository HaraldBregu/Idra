import fastifyExpress from '@fastify/express';
import { DefaultRequestHandler } from '@a2a-js/sdk/server';
import {
	UserBuilder,
	agentCardHandler,
	restHandler,
} from '@a2a-js/sdk/server/express';
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

	const cardRouter = Router();
	cardRouter.use((request, response, next) => {
		if (request.method === 'GET' && request.path === '/') return next();
		response.status(404).json({ error: 'Not Found' });
	});
	cardRouter.use(agentCardHandler({ agentCardProvider: handler }));
	server.use('/.well-known/agent-card.json', cardRouter);

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
