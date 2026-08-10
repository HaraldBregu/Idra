import { z } from 'zod';
import { lintWiki } from '../../../wiki/wiki_lint';
import { tool } from '../tool';

export const wikiRebuildTool = tool({
	name: 'wiki_rebuild_index',
	risk: 'high',
	effect: 'persistence',
	allowedOrigins: ['main'],
	description:
		'Transactionally rebuild index.md from current wiki page metadata and record the maintenance run.',
	defaultPermission: 'allow',
	inputSchema: z.object({}),
	execute: async () => {
		const lint = await lintWiki(true);
		return { rebuilt: true, remainingCriticalFindings: lint.critical.length };
	},
});
