import type { McpClient } from './mcp_types';

export async function close(client: McpClient): Promise<void> {
	await client.close();
}
