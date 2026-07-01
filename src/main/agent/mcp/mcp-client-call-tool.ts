import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

export function callTool(
	client: Client,
	name: string,
	args?: Record<string, unknown>,
): ReturnType<Client['callTool']> {
	return client.callTool({ name, arguments: args });
}
