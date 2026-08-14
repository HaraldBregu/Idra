import { z } from 'zod';
import { reviewWikiChange } from '../../knowledge/wiki/wiki_review';
import { tool } from '../tool';

export const reviewWikiChangesTool = tool({
	id: 'review_wiki_changes',
	name: 'Review wiki changes',
	description: 'Approve or reject one pending high-risk wiki change.',
	inputSchema: z.object({
		reviewId: z.string().trim().min(1),
		action: z.enum(['approve', 'reject']),
	}),
	execute: async ({ reviewId, action }) => reviewWikiChange(reviewId, action),
});
