import { z } from 'zod';
import { tool } from '../../agent/tools/tool';
import { getRecentWikiActivity } from '../wiki_recent_activity';

export const wikiActivityTool = tool({
	name: 'wiki_get_recent_activity',
	description: 'Read recent append-only wiki operations and pending human-review item IDs.',
	inputSchema: z.object({ count: z.number().int().min(1).max(50).optional() }),
	execute: async ({ count }) => getRecentWikiActivity(count),
});
