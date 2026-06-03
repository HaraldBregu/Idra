import { objectSchema, type RequestedTool } from './shared';

export const readMcpResourceTool = {
	name: 'functions.read_mcp_resource',
	description: 'Reads a specific MCP resource by server name and URI.',
	schema: objectSchema({
		server: { type: 'string' },
		uri: { type: 'string' },
	}, ['server', 'uri']),
} as const satisfies RequestedTool;
