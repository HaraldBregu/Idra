import { z } from 'zod';
import { deleteNote, readNote } from '../notes';
import type { Config, Tool } from '../types';
import { noteIdSchema } from './note_schema';
import { tool } from './tool';

export function deleteNoteTool(config: Config): Tool {
	return tool({
		name: 'delete_note',
		description: 'Permanently delete a persistent note by ID.',
		alwaysAsk: true,
		confirmDetail: (args) => {
			if (typeof args.id !== 'string') return undefined;
			const note = readNote(config, args.id);
			return note ? `${note.title}\n\n${note.content}` : undefined;
		},
		inputSchema: z.object({ id: noteIdSchema }),
		execute: ({ id }) =>
			deleteNote(config, id) ? { id, deleted: true } : { error: `Note '${id}' not found.` },
	});
}
