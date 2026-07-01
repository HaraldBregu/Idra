import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { McpData } from '../../../shared/mcp/mcp';
import type { McpClient } from './mcp-types';
import { buildTransport } from './mcp-client-build-transport';

export async function connect(id: string, data: McpData): Promise<McpClient> {
	const client = new Client({ name: 'friday', version: '1.0.0' });
	await client.connect(buildTransport(id, data));
	return client;
}
