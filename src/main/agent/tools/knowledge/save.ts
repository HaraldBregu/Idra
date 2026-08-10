import { z } from 'zod';
import { saveWikiAnalysis } from '../../knowledge/wiki/wiki_save_analysis';
import { tool } from '../tool';

const evidence = z.object({
	sourceId: z.string().trim().min(1),
	locator: z.string().trim().min(1),
	evidenceType: z.enum(['direct', 'indirect']),
});

export const wikiSaveTool = tool({
	id: 'wiki_save_analysis',
	name: 'wiki_save_analysis',
	description:
		'Save a durable, reusable comparison, synthesis, project analysis, or resolved research question. Search first and provide integrated source IDs. Do not save casual conversation, secrets, temporary status, or speculation. Unless automatic filing is enabled, call only when the user asks to persist the analysis.',
	inputSchema: z.object({
		title: z.string().trim().min(1).max(200),
		summary: z.string().trim().min(1).max(500),
		content: z.string().trim().min(1),
		pageType: z.enum(['comparison', 'synthesis', 'project', 'question']),
		sourceIds: z.array(z.string().trim().min(1)).min(1),
		tags: z.array(z.string().trim().min(1)).optional(),
		aliases: z.array(z.string().trim().min(1)).optional(),
		related: z.array(z.string().trim().min(1)).optional(),
		claims: z
			.array(
				z.object({
					id: z.string().trim().min(1),
					statement: z.string().trim().min(1),
					evidence: z.array(evidence).min(1),
					confidence: z.enum(['low', 'medium', 'high']),
					status: z.enum(['supported', 'disputed', 'superseded', 'unverified']),
					contradicts: z.array(z.string().trim().min(1)).optional(),
				})
			)
			.optional(),
		openQuestions: z.array(z.string().trim().min(1)).optional(),
	}),
	execute: async (input) => saveWikiAnalysis(input),
});
