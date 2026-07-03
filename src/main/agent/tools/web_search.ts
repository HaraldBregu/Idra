import { z } from 'zod';
import { tool } from './tool';

export const webSearchTool = tool({
	name: 'web_search',
	description:
		'Search the web for current information. Returns a list of results with title, url, and description. Requires the BRAVE_API_KEY environment variable.',
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
		const apiKey = process.env.BRAVE_API_KEY;
		if (!apiKey) throw new Error('web_search requires the BRAVE_API_KEY environment variable.');

		const url = new URL('https://api.search.brave.com/res/v1/web/search');
		url.searchParams.set('q', query);
		url.searchParams.set('count', String(count ?? 5));

		const res = await fetch(url, {
			headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
		});
		if (!res.ok) throw new Error(`web_search failed (${res.status}): ${res.statusText}`);

		const data = (await res.json()) as {
			web?: { results?: { title?: string; url?: string; description?: string }[] };
		};
		const results = (data.web?.results ?? []).map((r) => ({
			title: r.title ?? '',
			url: r.url ?? '',
			description: r.description ?? '',
		}));
		return JSON.stringify({ query, results }, null, 2);
	},
});
