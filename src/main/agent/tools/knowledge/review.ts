import { z } from 'zod';
import { reviewWikiChange } from '../../knowledge/wiki/wiki_review';
import { tool } from '../tool';

export const wikiReviewTool = tool({
	id: 'wiki_review_changes',
	name: 'Wiki review changes',
	description: 'Approve or reject one pending high-risk wiki change.',
	inputSchema: z.object({
		reviewId: z.string().trim().min(1),
		action: z.enum(['approve', 'reject']),
	}),
	execute: async ({ reviewId, action }) => reviewWikiChange(reviewId, action),
});
