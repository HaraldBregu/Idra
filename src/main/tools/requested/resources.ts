import { objectSchema, type RequestedTool } from './shared';

export const listMcpResourcesTool = {
	name: 'functions.list_mcp_resources',
	description: 'Lists resources exposed by configured MCP servers.',
	schema: objectSchema({
		cursor: { type: 'string' },
		server: { type: 'string' },
	}),
} as const satisfies RequestedTool;
