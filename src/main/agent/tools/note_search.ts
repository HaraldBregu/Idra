import { z } from 'zod';
import { searchNotes } from '../notes';
import { tool } from './tool';

export const searchNotesTool = tool({
	name: 'search_notes',
	description: 'Search notes by title, Markdown content, or metadata.',
	defaultPermission: 'allow',
	inputSchema: z.object({
		query: z.string().trim().min(1).describe('Case-insensitive text to find in notes.'),
	}),
	execute: ({ query }) => ({ notes: searchNotes(query) }),
});
