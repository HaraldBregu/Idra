import { z } from 'zod';
import { tool } from '../../agent/tools/tool';
import { buildWikiAnswerContext } from '../wiki_answer_context';

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
