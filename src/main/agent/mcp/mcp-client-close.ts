import type { McpClient } from './mcp-types';

export async function close(client: McpClient): Promise<void> {
	await client.close();
}
