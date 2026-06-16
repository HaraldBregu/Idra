import { McpClient } from './client';
import { McpTool } from './tool';
import type { Tool } from '../core/tool';
import type { McpNamedEntry, McpServerInfo } from '../../../shared/mcp/types';

export class McpClientManager {
	private readonly clients = new Map<string, McpClient>();

	constructor(private readonly getEntries: () => McpNamedEntry[]) {}

	async connect(logger?: { warn(src: string, msg: string): void }): Promise<void> {
		const entries = this.getEntries().filter((e) => e.config.enabled !== false);
		await Promise.allSettled(
			entries.map(async ({ name, config }) => {
				const client = new McpClient(name, config);
				await client.connect();
				if (!client.state.connected) {
					logger?.warn(
						'McpClientManager',
						`'${name}' failed to connect: ${client.state.errorMessage}`
					);
				}
				this.clients.set(name, client);
			})
		);
	}

	getTools(): Tool[] {
		const tools: Tool[] = [];
		for (const client of this.clients.values()) {
			if (!client.state.connected) continue;
			for (const def of client.state.tools) {
				tools.push(new McpTool(client, def.name, def.description, def.inputSchema));
			}
		}
		return tools;
	}

	getStatus(): McpServerInfo[] {
		return [...this.clients.values()].map((c) => ({
			serverName: c.name,
			status: c.state.connected ? ('connected' as const) : ('error' as const),
			errorMessage: c.state.errorMessage,
			toolNames: c.state.tools.map((t) => t.name),
		}));
	}

	async reconnect(name: string): Promise<void> {
		await this.clients.get(name)?.close();
		const entry = this.mcpServers.find((e) => e.name === name);
		if (!entry || entry.config.enabled === false) {
			this.clients.delete(name);
			return;
		}
		const client = new McpClient(name, entry.config);
		await client.connect();
		this.clients.set(name, client);
	}

	async disconnectOne(name: string): Promise<void> {
		await this.clients.get(name)?.close();
		this.clients.delete(name);
	}

	async disconnect(): Promise<void> {
		await Promise.allSettled([...this.clients.values()].map((c) => c.close()));
		this.clients.clear();
	}
}
