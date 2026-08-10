import { z } from 'zod';
import { lintWiki } from '../../knowledge/wiki/wiki_lint';
import { tool } from '../tool';

export const wikiRebuildTool = tool({
	id: 'wiki_rebuild_index',
	name: 'wiki_rebuild_index',
	description:
		'Transactionally rebuild index.md from current wiki page metadata and record the maintenance run.',
	inputSchema: z.object({}),
	execute: async () => {
		const lint = await lintWiki(true);
		return { rebuilt: true, remainingCriticalFindings: lint.critical.length };
	},
});
