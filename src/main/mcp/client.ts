import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpServerConfig } from '../../shared/mcp/types';

export interface McpToolDefinition {
	name: string;
	description?: string;
	inputSchema: Record<string, unknown>;
}

export interface McpClientState {
	connected: boolean;
	errorMessage?: string;
	tools: McpToolDefinition[];
}

export class McpClient {
	private readonly sdkClient: Client;
	private _state: McpClientState = { connected: false, tools: [] };

	constructor(readonly config: McpServerConfig) {
		this.sdkClient = new Client({ name: 'friday', version: '1.0.0' }, { capabilities: {} });
	}

	get state(): McpClientState {
		return this._state;
	}

	async connect(): Promise<void> {
		try {
			const transport = buildTransport(this.config);
			await this.sdkClient.connect(transport);
			const result = await this.sdkClient.listTools();
			this._state = {
				connected: true,
				tools: result.tools.map((t) => ({
					name: t.name,
					description: t.description,
					inputSchema: t.inputSchema as Record<string, unknown>,
				})),
			};
		} catch (error) {
			this._state = {
				connected: false,
				errorMessage: error instanceof Error ? error.message : String(error),
				tools: [],
			};
		}
	}

	async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
		if (!this._state.connected) {
			throw new Error(`MCP server '${this.config.label}' is not connected`);
		}
		return this.sdkClient.callTool({ name, arguments: args });
	}

	async close(): Promise<void> {
		try {
			await this.sdkClient.close();
		} catch {
			// ignore close errors
		}
		this._state = { connected: false, tools: [] };
	}
}

function buildTransport(config: McpServerConfig): Transport {
	const t = config.transport;
	if (t.type === 'stdio') {
		return new StdioClientTransport({
			command: t.command,
			args: t.args,
			env: t.env,
			cwd: t.cwd,
		});
	}
	if (t.type === 'sse') {
		return new SSEClientTransport(new URL(t.url), {
			requestInit: t.headers ? { headers: t.headers } : undefined,
		});
	}
	return new StreamableHTTPClientTransport(new URL(t.url), {
		requestInit: t.headers ? { headers: t.headers } : undefined,
	});
}
