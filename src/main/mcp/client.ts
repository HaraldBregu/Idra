import { app } from 'electron';
import { Inject, Service } from 'typedi';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { ConnectorData } from '../../shared/connector';
import { Connector } from './connector';

@Service()
export class McpClient {
	@Inject(() => Connector)
	private readonly connector!: Connector;

	private readonly clients = new Map<string, Client>();

	async connect(id: string): Promise<Client> {
		const connectorId = id.trim().toLowerCase();
		const existing = this.clients.get(connectorId);
		if (existing) return existing;

		const record = this.connector.get(connectorId);
		const data = record[connectorId];
		if (!data) throw new Error(`Connector not found: ${connectorId}`);
		if (data.enabled === false) throw new Error(`Connector is disabled: ${connectorId}`);

		const client = new Client({ name: app.getName(), version: app.getVersion() });
		try {
			await client.connect(buildTransport(data));
		} catch (error) {
			await client.close().catch(() => undefined);
			throw error;
		}
		this.clients.set(connectorId, client);
		return client;
	}

	async listTools(id: string): ReturnType<Client['listTools']> {
		const client = await this.connect(id);
		return client.listTools();
	}

	async callTool(
		id: string,
		name: string,
		args?: Record<string, unknown>
	): ReturnType<Client['callTool']> {
		const client = await this.connect(id);
		return client.callTool({ name, arguments: args });
	}

	async disconnect(id: string): Promise<void> {
		const connectorId = id.trim().toLowerCase();
		const client = this.clients.get(connectorId);
		if (!client) return;
		this.clients.delete(connectorId);
		await client.close();
	}

	async disconnectAll(): Promise<void> {
		const clients = [...this.clients.values()];
		this.clients.clear();
		await Promise.allSettled(clients.map((client) => client.close()));
	}
}

function buildTransport(data: ConnectorData): Transport {
	if (data.type === 'stdio') {
		return new StdioClientTransport({
			command: data.command,
			args: data.args ? [...data.args] : undefined,
			env: data.env ? { ...data.env } : undefined,
			cwd: data.cwd,
		});
	}

	const url = new URL(data.url);
	const headers = data.token ? { Authorization: `Bearer ${data.token}` } : undefined;

	if (data.type === 'sse') {
		return new SSEClientTransport(url, {
			requestInit: headers ? { headers } : undefined,
			eventSourceInit: headers
				? { fetch: (input, init) => fetch(input, { ...init, headers: { ...init?.headers, ...headers } }) }
				: undefined,
		});
	}

	return new StreamableHTTPClientTransport(url, {
		requestInit: headers ? { headers } : undefined,
	});
}
