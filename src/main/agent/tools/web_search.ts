import { z } from 'zod';
import { searchWeb } from '../../search';
import { tool } from './tool';

export const webSearchTool = tool({
	name: 'web_search',
	description:
		'Search the web for current information using the configured search engine. Returns a list of results with title, url, and description.',
	inputSchema: z.object({
		query: z.string().min(1).describe('Search query.'),
		count: z
			.number()
			.int()
			.min(1)
			.max(20)
			.optional()
			.describe('Number of results to return (default 5).'),
	}),
	execute: async ({ query, count }) => {
		return JSON.stringify(await searchWeb({ query, count }), null, 2);
	},
});
