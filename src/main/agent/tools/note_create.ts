import { z } from 'zod';
import { createNote } from '../notes';
import type { Config, Tool } from '../types';
import { noteMetadataSchema } from './note_schema';
import { tool } from './tool';

export function createNoteTool(config: Config): Tool {
	return tool({
		name: 'create_note',
		description: 'Create a persistent note with a title, Markdown content, and optional metadata.',
		defaultPermission: 'allow',
		inputSchema: z.object({
			title: z.string().trim().min(1).describe('Title of the note.'),
			content: z.string().describe('Full Markdown content of the note.'),
			metadata: noteMetadataSchema.optional(),
		}),
		execute: (input) => createNote(config, input),
	});
}
