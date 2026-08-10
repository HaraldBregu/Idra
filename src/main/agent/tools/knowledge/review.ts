import { z } from 'zod';
import { reviewWikiChange } from '../../../wiki/wiki_review';
import { tool } from '../tool';

export const wikiReviewTool = tool({
	name: 'wiki_review_changes',
	risk: 'critical',
	effect: 'persistence',
	allowedOrigins: ['main'],
	description: 'Approve or reject one pending high-risk wiki change.',
	defaultPermission: 'allow',
	stopOnReject: true,
	inputSchema: z.object({
		reviewId: z.string().trim().min(1),
		action: z.enum(['approve', 'reject']),
	}),
	confirmDetail: ({ reviewId, action }) => `${action} pending wiki change ${reviewId}`,
	execute: async ({ reviewId, action }) => reviewWikiChange(reviewId, action),
});
