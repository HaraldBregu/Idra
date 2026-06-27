import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpData } from '../../shared/mcp/mcp';
import { createOAuthProvider } from './oauth';
import { McpStore } from './store';

export class McpClient {
	private readonly client = new Client({ name: 'friday', version: '1.0.0' });

	constructor(
		private readonly id: string,
		private readonly data: McpData,
		private readonly store: McpStore,
	) {}

	async connect(): Promise<void> {
		await this.client.connect(buildTransport(this.id, this.data, this.store));
	}

	listTools(): ReturnType<Client['listTools']> {
		return this.client.listTools();
	}

	callTool(name: string, args?: Record<string, unknown>): ReturnType<Client['callTool']> {
		return this.client.callTool({ name, arguments: args });
	}

	async close(): Promise<void> {
		await this.client.close();
	}
}

function buildTransport(id: string, data: McpData, store: McpStore): Transport {
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

	return new StreamableHTTPClientTransport(url, {
		authProvider: createOAuthProvider({
			storage: {
				load: () => store.oauth(id),
				save: (state) => store.saveOauth(id, state),
			},
			clientId: data.client_id,
			clientSecret: data.client_secret,
		}),
		requestInit: headers ? { headers } : undefined,
	});
}
