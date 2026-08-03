import type { McpCallToolResult, McpClient } from './mcp_types';

export function callTool(
	client: McpClient,
	name: string,
	args?: Record<string, unknown>,
): McpCallToolResult {
	return client.callTool({ name, arguments: args });
}
