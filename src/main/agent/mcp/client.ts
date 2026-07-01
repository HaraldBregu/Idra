import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpData } from '../../../shared/mcp/mcp';
import { createOAuthProvider } from './oauth';
import { getMcpOauth, saveMcpOauth } from './mcp-store';

export async function connect(id: string, data: McpData): Promise<Client> {
	const client = new Client({ name: 'friday', version: '1.0.0' });
	await client.connect(buildTransport(id, data));
	return client;
}

export function listTools(client: Client): ReturnType<Client['listTools']> {
	return client.listTools();
}

export function callTool(
	client: Client,
	name: string,
	args?: Record<string, unknown>,
): ReturnType<Client['callTool']> {
	return client.callTool({ name, arguments: args });
}

export async function close(client: Client): Promise<void> {
	await client.close();
}

function buildTransport(id: string, data: McpData): Transport {
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
				load: () => getMcpOauth(id),
				save: (state) => saveMcpOauth(id, state),
			},
			clientId: data.client_id,
			clientSecret: data.client_secret,
		}),
		requestInit: headers ? { headers } : undefined,
	});
}
