import { z } from 'zod';
import { lintWiki } from '../../knowledge/wiki/wiki_lint';
import { tool } from '../tool';

export const lintWikiTool = tool({
	id: 'lint_wiki',
	name: 'Lint wiki',
	description:
		'Inspect wiki structure, provenance, contradictions, coverage, links, aliases, and quality. Automatic fixing is limited to deterministic index repair.',
	inputSchema: z.object({ autoFix: z.boolean().optional() }),
	execute: async ({ autoFix }) => lintWiki(autoFix),
});
