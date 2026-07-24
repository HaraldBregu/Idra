import { z } from 'zod';
import { createNote } from '../notes';
import { noteMetadataSchema } from './note_schema';
import { tool } from './tool';

export const createNoteTool = tool({
	name: 'create_note',
	description: 'Create a note with a title, Markdown content, and optional metadata.',
	defaultPermission: 'allow',
	inputSchema: z.object({
		title: z.string().trim().min(1).describe('Title of the note.'),
		content: z.string().describe('Full Markdown content of the note.'),
		metadata: noteMetadataSchema.optional(),
	}),
	execute: (input) => createNote(input),
});
