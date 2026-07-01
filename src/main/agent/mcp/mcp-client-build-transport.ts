import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpData } from '../../../shared/mcp/mcp';
import { createOAuthProvider } from './mcp-oauth-create-provider';
import { getMcpOauth, saveMcpOauth } from './mcp-store';

export function buildTransport(id: string, data: McpData): Transport {
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
