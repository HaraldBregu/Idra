import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { ConnectorConfig, ConnectorTool } from '../../../shared/connectors';
import { McpConnectionError } from '../errors';
import {
	DEFAULT_MCP_CONNECT_TIMEOUT_MS,
	DEFAULT_MCP_TOOL_TIMEOUT_MS,
	type McpCallOptions,
	withRetry,
	withTimeout,
} from '../timeout';
import type { IMcpTransportAdapter } from '../types';
import { riskForTool } from '../tool-utils';

export class HttpMcpTransport implements IMcpTransportAdapter {
	private client: Client | null = null;
	private transport: StreamableHTTPClientTransport | null = null;

	constructor(private readonly config: ConnectorConfig) {}

	async connect(options: McpCallOptions = {}): Promise<void> {
		if (!this.config.url) {
			throw new McpConnectionError('HTTP connectors require a URL.');
		}

		await withTimeout(
			`Connect to ${this.config.name}`,
			options.timeoutMs ?? DEFAULT_MCP_CONNECT_TIMEOUT_MS,
			async (signal) => {
				const client = new Client({ name: 'electron-ai-assistant', version: '1.0.0' });
				const transport = new StreamableHTTPClientTransport(new URL(this.config.url));
				await client.connect(transport, { signal, timeout: options.timeoutMs });
				this.client = client;
				this.transport = transport;
			},
			options.signal
		);
	}

	async disconnect(): Promise<void> {
		await this.client?.close();
		await this.transport?.close();
		this.client = null;
		this.transport = null;
	}

	async reconnect(options: McpCallOptions = {}): Promise<void> {
		await this.disconnect();
		await this.connect(options);
	}

	async healthCheck(options: McpCallOptions = {}): Promise<boolean> {
		const client = this.requireClient();
		await client.ping({ timeout: options.timeoutMs ?? DEFAULT_MCP_CONNECT_TIMEOUT_MS, signal: options.signal });
		return true;
	}

	async refreshTools(options: McpCallOptions = {}): Promise<ConnectorTool[]> {
		return this.listTools(options);
	}

	async listTools(options: McpCallOptions = {}): Promise<ConnectorTool[]> {
		const result = await this.requireClient().listTools(undefined, {
			timeout: options.timeoutMs ?? DEFAULT_MCP_CONNECT_TIMEOUT_MS,
			signal: options.signal,
		});
		return result.tools.map((tool) => ({
			name: tool.name,
			description: tool.description,
			inputSchema: tool.inputSchema,
			risk: riskForTool(tool.name, tool.description, tool.annotations?.destructiveHint),
		}));
	}

	async callTool(name: string, args: unknown, options: McpCallOptions = {}): Promise<unknown> {
		const client = this.requireClient();
		return withRetry(options.retries ?? 0, () =>
			client.callTool(
				{ name, arguments: args && typeof args === 'object' ? (args as Record<string, unknown>) : {} },
				undefined,
				{
					timeout: options.timeoutMs ?? DEFAULT_MCP_TOOL_TIMEOUT_MS,
					signal: options.signal,
				}
			)
		);
	}

	private requireClient(): Client {
		if (!this.client) {
			throw new McpConnectionError(`Connector is not connected: ${this.config.name}`);
		}
		return this.client;
	}
}
