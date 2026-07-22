import { z } from 'zod';
import { updateNote } from '../notes';
import type { Config, Tool } from '../types';
import { noteIdSchema, noteMetadataSchema } from './note_schema';
import { tool } from './tool';

export function updateNoteTool(config: Config): Tool {
	return tool({
		name: 'update_note',
		description: 'Update the title, Markdown content, and/or metadata of a persistent note.',
		defaultPermission: 'allow',
		inputSchema: z
			.object({
				id: noteIdSchema,
				title: z.string().trim().min(1).optional().describe('Replacement note title.'),
				content: z.string().optional().describe('Replacement Markdown content.'),
				metadata: noteMetadataSchema.optional().describe('Replacement metadata object.'),
			})
			.refine(
				({ title, content, metadata }) =>
					title !== undefined || content !== undefined || metadata !== undefined,
				{ message: 'Provide at least one field to update.' }
			),
		execute: ({ id, ...updates }) =>
			updateNote(config, id, updates) ?? { error: `Note '${id}' not found.` },
	});
}
