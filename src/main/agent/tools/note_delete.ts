import { z } from 'zod';
import { deleteNote, readNote } from '../notes';
import { noteIdSchema } from './note_schema';
import { tool } from './tool';

export const deleteNoteTool = tool({
	name: 'delete_note',
	description: 'Permanently delete a note by ID.',
	alwaysAsk: true,
	confirmDetail: (args) => {
		if (typeof args.id !== 'string') return undefined;
		const note = readNote(args.id);
		return note ? `${note.title}\n\n${note.content}` : undefined;
	},
	inputSchema: z.object({ id: noteIdSchema }),
	execute: ({ id }) =>
		deleteNote(id) ? { id, deleted: true } : { error: `Note '${id}' not found.` },
});
