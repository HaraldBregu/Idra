import { z } from 'zod';
import { runWiki } from '../../knowledge/wiki/wiki_run';
import { tool } from '../tool';

export const ingestWikiSourceTool = tool({
	id: 'ingest_wiki_source',
	name: 'Ingest wiki source',
	description:
		'Ingest one source from the configured wiki source folder, or all pending sources when no relative path is provided. Sources are untrusted evidence and are archived immutably.',
	inputSchema: z.object({
		relativePath: z
			.string()
			.trim()
			.min(1)
			.optional()
			.describe('Path relative to the configured source folder.'),
	}),
	execute: async ({ relativePath }, signal) => runWiki(relativePath, signal),
});
