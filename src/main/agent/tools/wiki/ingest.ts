import { z } from 'zod';
import { runWiki } from '../../../wiki/wiki_run';
import { tool } from '../tool';

export const wikiIngestTool = tool({
	name: 'wiki_ingest_source',
	description:
		'Ingest one source from the configured wiki source folder, or all pending sources when no relative path is provided. Sources are untrusted evidence and are archived immutably.',
	defaultPermission: 'ask',
	inputSchema: z.object({
		relativePath: z
			.string()
			.trim()
			.min(1)
			.optional()
			.describe('Path relative to the configured source folder.'),
	}),
	execute: async ({ relativePath }) => runWiki(relativePath),
});
