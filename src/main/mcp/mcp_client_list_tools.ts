import type { McpClient, McpListToolsResult } from './mcp_types';

export function listTools(client: McpClient): McpListToolsResult {
	return client.listTools();
}
