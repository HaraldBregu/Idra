import type { Context, Tool } from '../core/tool';
import type { McpManager } from '../../mcp';
import { McpTool } from './tool';

/**
 * Builds agent tools from every enabled MCP server. Mirrors `ToolLoader`, but
 * loading is async because each server's tool list is fetched over its live
 * connection. A server that fails to connect or list is skipped so it cannot
 * break the rest of the run.
 */
export class McpToolLoader {
	constructor(
		private readonly connector: McpManager,
		private readonly context: Context
	) {}

	async load(): Promise<Tool[]> {
		const servers = Object.entries(this.connector.list()).filter(
			([, data]) => data.enabled !== false
		);

		const perServer = await Promise.all(
			servers.map(async ([id]) => {
				try {
					const { tools } = await this.connector.listTools(id);
					return tools.map((tool) => new McpTool(this.context, this.connector, id, tool));
				} catch {
					return [];
				}
			})
		);

		return perServer.flat();
	}
}
