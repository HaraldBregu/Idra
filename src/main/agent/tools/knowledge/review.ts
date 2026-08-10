import { z } from 'zod';
import { reviewWikiChange } from '../../knowledge/wiki/wiki_review';
import { tool } from '../tool';

export const wikiReviewTool = tool({
	name: 'wiki_review_changes',
	description: 'Approve or reject one pending high-risk wiki change.',
	inputSchema: z.object({
		reviewId: z.string().trim().min(1),
		action: z.enum(['approve', 'reject']),
	}),
	execute: async ({ reviewId, action }) => reviewWikiChange(reviewId, action),
});
