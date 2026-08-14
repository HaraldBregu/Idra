import { z } from 'zod';
import { lintWiki } from '../../knowledge/wiki/wiki_lint';
import { tool } from '../tool';

export const rebuildWikiIndexTool = tool({
	id: 'rebuild_wiki_index',
	name: 'Rebuild wiki index',
	description:
		'Transactionally rebuild index.md from current wiki page metadata and record the maintenance run.',
	inputSchema: z.object({}),
	execute: async () => {
		const lint = await lintWiki(true);
		return { rebuilt: true, remainingCriticalFindings: lint.critical.length };
	},
});
