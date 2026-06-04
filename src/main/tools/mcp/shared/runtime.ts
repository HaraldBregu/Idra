import type { Client } from '@modelcontextprotocol/sdk/client';
import type { ConnectorsService } from '../../../connectors';
import type { McpConnectors } from './types';
import { withRemoteMcpClient } from './client';

type StoredConnector = ReturnType<ConnectorsService['listStored']>[number];

export class RemoteMcpConnectors implements McpConnectors {
	constructor(private readonly connectors: ConnectorsService) {}

	list(): ReturnType<McpConnectors['list']> {
		return this.connectors.list().filter((connector) => Boolean(connector.serverUrl));
	}

	async reconnect(id: string): Promise<unknown> {
		const connector = this.remoteConnector(id);
		try {
			const result = await withRemoteMcpClient(connector, async (client) => ({
				id: connector.id,
				serverLabel: connector.serverLabel,
				serverUrl: connector.serverUrl,
				serverCapabilities: client.getServerCapabilities(),
				serverVersion: client.getServerVersion(),
				instructions: client.getInstructions(),
			}));
			this.replace(connector, { lastError: undefined });
			return result;
		} catch (error) {
			this.replace(connector, { lastError: errorMessage(error) });
			throw error;
		}
	}

	async refreshTools(id: string): Promise<unknown> {
		const connector = this.remoteConnector(id);
		try {
			const tools = await this.fetchTools(connector);
			const lastRefreshedAt = new Date().toISOString();
			this.replace(connector, { tools, lastRefreshedAt, lastError: undefined });
			return {
				id: connector.id,
				serverLabel: connector.serverLabel,
				toolsCount: tools.length,
				tools,
				lastRefreshedAt,
			};
		} catch (error) {
			this.replace(connector, { lastError: errorMessage(error) });
			throw error;
		}
	}

	async listTools(id: string, options?: unknown): Promise<unknown> {
		const connector = this.remoteConnector(id);
		return this.fetchTools(connector, options);
	}

	async callTool(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown> {
		if (typeof id !== 'string') throw new Error('MCP server id must be a string.');
		if (typeof name !== 'string') throw new Error('MCP tool name must be a string.');
		const connector = this.remoteConnector(id);
		this.assertToolAllowed(connector, name);
		return withRemoteMcpClient(connector, (client, requestOptions) =>
			client.callTool({ name, arguments: isRecord(args) ? args : {} }, undefined, requestOptions), options);
	}

	async listResources(id: unknown, options?: unknown): Promise<unknown> {
		if (typeof id !== 'string') throw new Error('MCP server id must be a string.');
		const connector = this.remoteConnector(id);
		return withRemoteMcpClient(connector, (client, requestOptions) =>
			client.listResources(undefined, requestOptions), options);
	}

	async readResource(id: unknown, uri: unknown, options?: unknown): Promise<unknown> {
		if (typeof id !== 'string') throw new Error('MCP server id must be a string.');
		if (typeof uri !== 'string') throw new Error('MCP resource uri must be a string.');
		const connector = this.remoteConnector(id);
		return withRemoteMcpClient(connector, (client, requestOptions) =>
			client.readResource({ uri }, requestOptions), options);
	}

	async listPrompts(id: unknown, options?: unknown): Promise<unknown> {
		if (typeof id !== 'string') throw new Error('MCP server id must be a string.');
		const connector = this.remoteConnector(id);
		return withRemoteMcpClient(connector, (client, requestOptions) =>
			client.listPrompts(undefined, requestOptions), options);
	}

	async getPrompt(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown> {
		if (typeof id !== 'string') throw new Error('MCP server id must be a string.');
		if (typeof name !== 'string') throw new Error('MCP prompt name must be a string.');
		const connector = this.remoteConnector(id);
		return withRemoteMcpClient(connector, (client, requestOptions) =>
			client.getPrompt({ name, arguments: isRecord(args) ? args : {} }, requestOptions), options);
	}

	private async fetchTools(connector: StoredConnector, options?: unknown): Promise<StoredConnector['tools']> {
		const response = await withRemoteMcpClient(connector, (client, requestOptions) =>
			client.listTools(undefined, requestOptions), options);
		return response.tools
			.filter((tool) => this.toolAllowed(connector, tool.name))
			.map((tool) => ({
				name: tool.name,
				description: tool.description,
				inputSchema: tool.inputSchema,
				permission: this.toolRequiresApproval(connector, tool.name)
					? 'needs-approval'
					: 'always-allow',
				requiresApproval: this.toolRequiresApproval(connector, tool.name),
			}));
	}

	private remoteConnector(id: string): StoredConnector {
		const connector = this.connectors.getStored(id);
		if (!connector.serverUrl?.trim()) throw new Error(`Connector is not a remote MCP server: ${id}`);
		if (!connector.enabled) throw new Error(`MCP server is disabled: ${id}`);
		return connector;
	}

	private replace(connector: StoredConnector, patch: Partial<StoredConnector>): void {
		this.connectors.replaceStored({
			...connector,
			...patch,
			updatedAt: new Date().toISOString(),
		});
	}

	private assertToolAllowed(connector: StoredConnector, name: string): void {
		if (this.toolAllowed(connector, name)) return;
		throw new Error(`MCP tool is not allowed by this server configuration: ${name}`);
	}

	private toolAllowed(connector: StoredConnector, name: string): boolean {
		return connector.allowedTools.length === 0 || connector.allowedTools.includes(name);
	}

	private toolRequiresApproval(connector: StoredConnector, name: string): boolean {
		if (connector.requireApproval === 'never') return false;
		if (connector.requireApproval === 'never_for_allowed_tools') {
			return !connector.allowedTools.includes(name);
		}
		return true;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
