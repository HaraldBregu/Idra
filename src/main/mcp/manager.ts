import { Inject, Service } from 'typedi';
import type { McpSettings } from '../../shared/mcp';
import { McpService } from './service';
import { McpClient } from './client';

@Service()
export class McpManager {
	@Inject(() => McpService)
	private readonly service!: McpService;

	private readonly clients = new Map<string, McpClient>();

	list(): McpSettings {
		return this.service.list();
	}

	async listTools(id: string): ReturnType<McpClient['listTools']> {
		const client = await this.connect(id);
		return client.listTools();
	}

	async callTool(
		id: string,
		name: string,
		args?: Record<string, unknown>
	): ReturnType<McpClient['callTool']> {
		const client = await this.connect(id);
		return client.callTool(name, args);
	}

	async disconnect(id: string): Promise<void> {
		const client = this.clients.get(id);
		if (!client) return;
		this.clients.delete(id);
		await client.close();
	}

	private async connect(id: string): Promise<McpClient> {
		const existing = this.clients.get(id);
		if (existing) return existing;
		const data = this.service.list()[id];
		if (!data) throw new Error(`Connector "${id}" not found.`);
		const client = new McpClient(data);
		await client.connect();
		this.clients.set(id, client);
		return client;
	}
}
