import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpData } from '../../shared/mcp/mcp';

export async function createMcpClient(data: McpData): Promise<Client> {
	const client = new Client({ name: 'friday', version: '1.0.0' });
	await client.connect(buildTransport(data));
	return client;
}

function buildTransport(data: McpData): Transport {
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
		requestInit: headers ? { headers } : undefined,
	});
}
