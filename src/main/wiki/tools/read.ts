import { z } from 'zod';
import { tool } from '../../agent/tools/tool';
import { readWikiPage } from '../wiki_read_page';

export const wikiReadTool = tool({
	name: 'wiki_read_page',
	description: 'Read one compiled wiki page by path, page ID, exact title, or alias.',
	inputSchema: z.object({ page: z.string().trim().min(1) }),
	execute: async ({ page }) => JSON.stringify(await readWikiPage(page), null, 2),
});
