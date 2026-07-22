import { z } from 'zod';
import { searchNotes } from '../notes';
import type { Config, Tool } from '../types';
import { tool } from './tool';

export function searchNotesTool(config: Config): Tool {
	return tool({
		name: 'search_notes',
		description: 'Search persistent notes by title, Markdown content, or metadata.',
		defaultPermission: 'allow',
		inputSchema: z.object({
			query: z.string().trim().min(1).describe('Case-insensitive text to find in notes.'),
		}),
		execute: ({ query }) => ({ notes: searchNotes(config, query) }),
	});
}
