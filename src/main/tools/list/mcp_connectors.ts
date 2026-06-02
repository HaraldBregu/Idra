import type { McpConnectors } from './mcp_types';

export function mcpConnectors(ctx: { services: unknown }): McpConnectors | undefined {
	const connectors = (ctx.services as { connectors?: Partial<McpConnectors> }).connectors;
	if (!connectors) return undefined;
	if (
		typeof connectors.list !== 'function' ||
		typeof connectors.reconnect !== 'function' ||
		typeof connectors.refreshTools !== 'function' ||
		typeof connectors.listTools !== 'function' ||
		typeof connectors.callTool !== 'function' ||
		typeof connectors.listResources !== 'function' ||
		typeof connectors.readResource !== 'function' ||
		typeof connectors.listPrompts !== 'function' ||
		typeof connectors.getPrompt !== 'function'
	) {
		return undefined;
	}
	return connectors as McpConnectors;
}
