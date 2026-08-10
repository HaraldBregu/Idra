import { z } from 'zod';
import { getRecentWikiActivity } from '../../knowledge/wiki/wiki_recent_activity';
import { tool } from '../tool';

export const getRecentWikiActivityTool = tool({
	id: 'get_recent_wiki_activity',
	name: 'Get recent wiki activity',
	description: 'Read recent append-only wiki operations and pending human-review item IDs.',
	inputSchema: z.object({ count: z.number().int().min(1).max(50).optional() }),
	execute: async ({ count }) => getRecentWikiActivity(count),
});
