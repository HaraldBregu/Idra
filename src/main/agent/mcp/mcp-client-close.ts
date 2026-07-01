import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

export async function close(client: Client): Promise<void> {
	await client.close();
}
