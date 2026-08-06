import { z } from 'zod';
import { tool } from '../../agent/tools/tool';
import { searchWiki } from '../wiki_search';

export const wikiSearchTool = tool({
	name: 'wiki_search',
	description:
		'Search compiled wiki pages by exact title, alias, metadata, full text, and linked-page relevance. Returns wiki synthesis, never primary evidence.',
	inputSchema: z.object({
		query: z.string().trim().min(1),
		count: z.number().int().min(1).max(20).optional(),
	}),
	execute: async ({ query, count }) => JSON.stringify(await searchWiki(query, count), null, 2),
});
