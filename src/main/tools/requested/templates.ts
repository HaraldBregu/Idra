import { objectSchema, type RequestedTool } from './shared';

export const listMcpResourceTemplatesTool = {
	name: 'functions.list_mcp_resource_templates',
	description: 'Lists parameterized resource templates exposed by configured MCP servers.',
	schema: objectSchema({
		cursor: { type: 'string' },
		server: { type: 'string' },
	}),
} as const satisfies RequestedTool;
