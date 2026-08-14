import { Agent } from './agent/agent';
import { ExecSandbox } from './agent/sandbox';
import { loadConfig } from './config';
import { createApiServer } from './server';

const config = loadConfig();
const agent = new Agent(new ExecSandbox());
const server = createApiServer(agent);

await server.listen({ port: config.port, host: '0.0.0.0' });

const shutdown = async (): Promise<void> => {
	agent.destroy();
	await server.close();
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
