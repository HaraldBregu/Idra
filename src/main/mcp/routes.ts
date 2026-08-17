import type { FastifyInstance } from 'fastify';
import type { AgentPort } from '../a2a/executor';
import type { AdminAuthentication } from '../admin/types';
import { readSettings } from '../storage/settings_read';
import { writeSettings } from '../storage/settings_write';

interface McpBody {
	enabled: boolean;
}

export function registerMcpRoutes(
	server: FastifyInstance,
	dataDirectory: string,
	authenticate: AdminAuthentication,
	agent: AgentPort
): void {
	server.get('/mcp/playwright', { onRequest: authenticate }, async () => {
		const settings = readSettings(dataDirectory).settings;
		const mcp = settings.mcp as Record<string, unknown> | undefined;
		return {
			enabled:
				Boolean(mcp && typeof mcp === 'object' && !Array.isArray(mcp) && mcp.playwright === true) ||
				process.env.IDRA_PLAYWRIGHT_MCP === 'true',
		};
	});
	server.put<{ Body: McpBody }>(
		'/mcp/playwright',
		{
			onRequest: authenticate,
			schema: {
				body: {
					type: 'object',
					required: ['enabled'],
					additionalProperties: false,
					properties: { enabled: { type: 'boolean' } },
				},
			},
		},
		async (request) => {
			const settings = readSettings(dataDirectory).settings;
			writeSettings(dataDirectory, { ...settings, mcp: { playwright: request.body.enabled } });
			await agent.configurePlaywrightMcp?.(request.body.enabled);
			return { enabled: request.body.enabled };
		}
	);
}
