import { z } from 'zod';
import { readNote } from '../notes';
import { noteIdSchema } from './note_schema';
import { tool } from './tool';

export const readNoteTool = tool({
	name: 'read_note',
	description: 'Read a note by ID, including its content and metadata.',
	defaultPermission: 'allow',
	inputSchema: z.object({ id: noteIdSchema }),
	execute: ({ id }) => readNote(id) ?? { error: `Note '${id}' not found.` },
});
