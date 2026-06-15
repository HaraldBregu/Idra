import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpServerConfig, McpServerOAuth } from '../../shared/mcp/types';

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
	private _headers: Record<string, string> | undefined;
	private _oauth: McpServerOAuth | undefined;

	constructor(readonly config: McpServerConfig) {
		this.sdkClient = newSdkClient();
		const t = config.transport;
		this._headers = t.type !== 'stdio' && t.headers ? { ...t.headers } : undefined;
		this._oauth = config.oauth ? { ...config.oauth } : undefined;
	}

	get state(): McpClientState {
		return this._state;
	}

	async connect(): Promise<void> {
		try {
			const transport = buildTransport(this.config, this._headers);
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
		if (this._oauth && isOAuthExpired(this._oauth)) {
			await this.refreshOAuth();
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

	private async refreshOAuth(): Promise<void> {
		const oauth = this._oauth!;
		const clientId = process.env[oauth.clientIdEnv];
		if (!clientId) return;

		try {
			const body = new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: oauth.refreshToken,
				client_id: clientId,
			});
			const clientSecret = oauth.clientSecretEnv ? process.env[oauth.clientSecretEnv] : undefined;
			if (clientSecret) body.set('client_secret', clientSecret);

			const response = await fetch(oauth.tokenUrl, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body,
			});
			if (!response.ok) return;

			const payload = (await response.json()) as Record<string, unknown>;
			const accessToken =
				typeof payload.access_token === 'string' ? payload.access_token.trim() : '';
			if (!accessToken) return;

			this._headers = { ...(this._headers ?? {}), Authorization: `Bearer ${accessToken}` };

			if (typeof payload.refresh_token === 'string' && payload.refresh_token) {
				oauth.refreshToken = payload.refresh_token;
			}
			oauth.tokenExpiresAt =
				typeof payload.expires_in === 'number'
					? new Date(Date.now() + payload.expires_in * 1000).toISOString()
					: undefined;

			await this.close();
			this.sdkClient = newSdkClient();
			await this.connect();
		} catch {
			// Let the call proceed with the current (expired) token; it will surface the error naturally
		}
	}
}

function newSdkClient(): Client {
	return new Client({ name: 'friday', version: '1.0.0' }, { capabilities: {} });
}

function buildTransport(
	config: McpServerConfig,
	headers: Record<string, string> | undefined
): Transport {
	const t = config.transport;
	if (t.type === 'stdio') {
		return new StdioClientTransport({
			command: t.command,
			args: t.args,
			env: t.env,
			cwd: t.cwd,
		});
	}
	const effectiveHeaders = headers ?? t.headers;
	if (t.type === 'sse') {
		return new SSEClientTransport(new URL(t.url), {
			requestInit: effectiveHeaders ? { headers: effectiveHeaders } : undefined,
		});
	}
	return new StreamableHTTPClientTransport(new URL(t.url), {
		requestInit: effectiveHeaders ? { headers: effectiveHeaders } : undefined,
	});
}

function isOAuthExpired(oauth: McpServerOAuth): boolean {
	if (!oauth.tokenExpiresAt) return false;
	return Date.now() > new Date(oauth.tokenExpiresAt).getTime() - 5 * 60 * 1000;
}
