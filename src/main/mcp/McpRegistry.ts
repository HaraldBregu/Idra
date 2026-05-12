import type { ConnectorConfig, ConnectorTool } from '../../shared/connectors';
import type { McpCallOptions } from './timeout';
import type { IMcpTransportAdapter, McpTransportFactory } from './types';

export class McpRegistry {
	private readonly adapters = new Map<string, IMcpTransportAdapter>();

	constructor(private readonly factory: McpTransportFactory) {}

	async connect(config: ConnectorConfig, options?: McpCallOptions): Promise<void> {
		const adapter = this.factory.create(config);
		await adapter.connect(options);
		this.adapters.set(config.id, adapter);
	}

	async disconnect(id: string): Promise<void> {
		const adapter = this.adapters.get(id);
		if (!adapter) return;
		await adapter.disconnect();
		this.adapters.delete(id);
	}

	async reconnect(config: ConnectorConfig, options?: McpCallOptions): Promise<void> {
		await this.disconnect(config.id);
		await this.connect(config, options);
	}

	async healthCheck(id: string, options?: McpCallOptions): Promise<boolean> {
		return this.requireAdapter(id).healthCheck(options);
	}

	async refreshTools(id: string, options?: McpCallOptions): Promise<ConnectorTool[]> {
		return this.requireAdapter(id).refreshTools(options);
	}

	async listTools(id: string, options?: McpCallOptions): Promise<ConnectorTool[]> {
		return this.requireAdapter(id).listTools(options);
	}

	async callTool(
		connectorId: string,
		toolName: string,
		args: unknown,
		options?: McpCallOptions
	): Promise<unknown> {
		return this.requireAdapter(connectorId).callTool(toolName, args, options);
	}

	isConnected(id: string): boolean {
		return this.adapters.has(id);
	}

	private requireAdapter(id: string): IMcpTransportAdapter {
		const adapter = this.adapters.get(id);
		if (!adapter) {
			throw new Error(`Connector is not connected: ${id}`);
		}
		return adapter;
	}
}
