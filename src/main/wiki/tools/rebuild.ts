import { z } from 'zod';
import { tool } from '../../agent/tools/tool';
import { lintWiki } from '../wiki_lint';

export const wikiRebuildTool = tool({
	name: 'wiki_rebuild_index',
	description:
		'Transactionally rebuild index.md from current wiki page metadata and record the maintenance run.',
	defaultPermission: 'ask',
	inputSchema: z.object({}),
	execute: async () => {
		const lint = await lintWiki(true);
		return { rebuilt: true, remainingCriticalFindings: lint.critical.length };
	},
});
