import { Agent } from '../agent/agent';
import { createApiServer } from './server';

const agent = new Agent();
const server = await createApiServer(agent);

await server.listen({ port: 3000, host: '0.0.0.0' });

const shutdown = async (): Promise<void> => {
	agent.destroy();
	await server.close();
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
