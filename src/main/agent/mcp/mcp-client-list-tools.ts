import type { McpClient, McpListToolsResult } from './mcp-types';

export function listTools(client: McpClient): McpListToolsResult {
	return client.listTools();
}
