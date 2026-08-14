import type { McpClient, McpListToolsResult } from './mcp_types';

export function listTools(
	client: McpClient,
	timeout?: number,
	signal?: AbortSignal
): McpListToolsResult {
	return client.listTools(undefined, timeout === undefined ? undefined : { timeout, signal });
}
