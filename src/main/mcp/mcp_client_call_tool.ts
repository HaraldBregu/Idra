import type { McpCallToolResult, McpClient } from './mcp_types';

export function callTool(
	client: McpClient,
	name: string,
	args?: Record<string, unknown>,
	timeout = 30_000,
	signal?: AbortSignal
): McpCallToolResult {
	return client.callTool({ name, arguments: args }, undefined, { timeout, signal });
}
