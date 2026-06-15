import { McpClient } from './client';
import { McpTool } from './tool';
import type { McpServerStore } from './store';
import type { Tool } from '../agent/core/tool';
import type { McpServerInfo } from '../../shared/mcp/types';

export class McpClientManager {
	private readonly clients = new Map<string, McpClient>();

	constructor(private readonly store: McpServerStore) {}

	async connect(logger?: { warn(src: string, msg: string): void }): Promise<void> {
		const configs = this.store.list().filter((c) => c.enabled);
		await Promise.allSettled(
			configs.map(async (config) => {
				const client = new McpClient(config, (oauth, accessToken) =>
					this.persistOAuthRefresh(config, oauth, accessToken)
				);
				await client.connect();
				if (!client.state.connected) {
					logger?.warn(
						'McpClientManager',
						`'${config.label}' failed to connect: ${client.state.errorMessage}`
					);
				}
				this.clients.set(config.id, client);
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
			serverId: c.config.id,
			label: c.config.label,
			status: c.state.connected ? ('connected' as const) : ('error' as const),
			errorMessage: c.state.errorMessage,
			toolNames: c.state.tools.map((t) => t.name),
		}));
	}

	async reconnect(serverId: string): Promise<void> {
		await this.clients.get(serverId)?.close();
		const config = this.store.get(serverId);
		if (!config?.enabled) {
			this.clients.delete(serverId);
			return;
		}
		const client = new McpClient(config, (oauth, accessToken) =>
			this.persistOAuthRefresh(config, oauth, accessToken)
		);
		await client.connect();
		this.clients.set(serverId, client);
	}

	private persistOAuthRefresh(
		config: McpServerConfig,
		oauth: McpServerOAuth,
		accessToken: string
	): void {
		const updatedTransport =
			config.transport.type !== 'stdio'
				? {
						...config.transport,
						headers: {
							...(config.transport.headers ?? {}),
							Authorization: `Bearer ${accessToken}`,
						},
					}
				: config.transport;
		this.store.upsert({ ...config, transport: updatedTransport, oauth });
	}

	async disconnect(): Promise<void> {
		await Promise.allSettled([...this.clients.values()].map((c) => c.close()));
		this.clients.clear();
	}
}
