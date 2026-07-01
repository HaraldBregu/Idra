import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

export function listTools(client: Client): ReturnType<Client['listTools']> {
	return client.listTools();
}
