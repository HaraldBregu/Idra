import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { McpData } from '../../shared/mcp_types';
import type { McpClient } from './mcp_types';
import { buildTransport } from './mcp_client_build_transport';

export async function connect(id: string, data: McpData): Promise<McpClient> {
	const client = new Client({ name: 'friday', version: '1.0.0' });
	await client.connect(buildTransport(id, data), { timeout: 300_000 });
	return client;
}
