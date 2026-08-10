import { z } from 'zod';
import { readWikiPage } from '../../../wiki/wiki_read_page';
import { tool } from '../tool';

export const wikiReadTool = tool({
	name: 'wiki_read_page',
	defaultPermission: 'allow',
	description: 'Read one compiled wiki page by path, page ID, exact title, or alias.',
	inputSchema: z.object({ page: z.string().trim().min(1) }),
	execute: async ({ page }) => JSON.stringify(await readWikiPage(page), null, 2),
});
