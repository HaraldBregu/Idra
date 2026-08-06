import { z } from 'zod';
import { buildWikiAnswerContext } from '../../../wiki/wiki_answer_context';
import { tool } from '../tool';

export const wikiQueryTool = tool({
	name: 'wiki_query',
	description:
		'Build grounded answer context from the compiled wiki first. Set includeRaw for quotations, exact numbers or dates, low confidence, primary evidence requests, or disagreements. Results separate synthesis, raw evidence, contradictions, and limitations.',
	inputSchema: z.object({
		query: z.string().trim().min(1),
		includeRaw: z.boolean().optional(),
	}),
	execute: async ({ query, includeRaw }) =>
		JSON.stringify(await buildWikiAnswerContext(query, includeRaw), null, 2),
});
