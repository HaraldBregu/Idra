import { z } from 'zod';
import { lintWiki } from '../../../wiki/wiki_lint';
import { tool } from '../tool';

export const wikiLintTool = tool({
	name: 'wiki_lint',
	risk: 'high',
	effect: 'persistence',
	allowedOrigins: ['main'],
	description:
		'Inspect wiki structure, provenance, contradictions, coverage, links, aliases, and quality. Automatic fixing is limited to deterministic index repair.',
	defaultPermission: 'allow',
	inputSchema: z.object({ autoFix: z.boolean().optional() }),
	execute: async ({ autoFix }) => lintWiki(autoFix),
});
