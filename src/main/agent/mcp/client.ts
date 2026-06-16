import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpServerConfig } from '../../../shared/mcp/types';

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
	private sdkClient: Client;
	private _state: McpClientState = { connected: false, tools: [] };

	constructor(
		readonly name: string,
		readonly config: McpServerConfig,
	) {
		this.sdkClient = newSdkClient();
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

	async callTool(toolName: string, args: Record<string, unknown>): Promise<string> {
		if (!this._state.connected) {
			throw new Error(`MCP server '${this.name}' is not connected`);
		}

		let raw: unknown;
		try {
			raw = await this.sdkClient.callTool({ name: toolName, arguments: args });
		} catch (error) {
			const extracted = extractErrorFromSdkThrow(error);
			throw new Error(extracted ?? (error instanceof Error ? error.message : String(error)));
		}

		const result = raw as { content?: unknown[]; isError?: boolean };
		const text = extractContentText(result.content ?? []);

		if (result.isError) {
			throw new Error(text || `Tool '${toolName}' returned an error`);
		}

		return text;
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

function newSdkClient(): Client {
	return new Client({ name: 'friday', version: '1.0.0' }, { capabilities: {} });
}

function buildTransport(config: McpServerConfig): Transport {
	if ('command' in config) {
		return new StdioClientTransport({
			command: config.command,
			args: config.args,
			env: config.env,
			cwd: config.cwd,
		});
	}
	const headers = config.auth ? { Authorization: `Bearer ${config.auth.token}` } : undefined;
	if (config.type === 'sse') {
		return new SSEClientTransport(new URL(config.url), {
			requestInit: headers ? { headers } : undefined,
		});
	}
	return new StreamableHTTPClientTransport(new URL(config.url), {
		requestInit: headers ? { headers } : undefined,
	});
}

function extractContentText(content: unknown[]): string {
	if (!Array.isArray(content)) return '';
	return content
		.map((block) => {
			if (typeof block !== 'object' || block === null) return '';
			const b = block as Record<string, unknown>;
			if (b.type === 'text' && typeof b.text === 'string') return b.text;
			if (b.type === 'image') return '[image]';
			if (b.type === 'resource') return JSON.stringify(b.resource ?? '');
			return '';
		})
		.filter(Boolean)
		.join('\n');
}

function extractErrorFromSdkThrow(error: unknown): string | undefined {
	const msg = error instanceof Error ? error.message : String(error);
	const match = msg.match(/(\{[\s\S]*\})/);
	if (!match) return undefined;
	try {
		const parsed = JSON.parse(match[1]) as Record<string, unknown>;
		const result = parsed.result as Record<string, unknown> | undefined;
		if (result?.content) {
			const text = extractContentText(result.content as unknown[]);
			if (text) return text;
		}
		const err = parsed.error as Record<string, unknown> | undefined;
		if (typeof err?.message === 'string') return err.message;
	} catch {
		// not JSON
	}
	return undefined;
}
