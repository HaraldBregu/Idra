import { objectSchema, type RequestedTool } from './shared';

export const toolSearchTool = {
	name: 'tool_search.tool_search_tool',
	description: 'Searches deferred tool metadata and exposes matching tools for the next model step.',
	schema: objectSchema({
		query: { type: 'string' },
		limit: { type: 'number' },
	}, ['query']),
} as const satisfies RequestedTool;
