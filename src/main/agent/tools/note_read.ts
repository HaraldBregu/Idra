import { z } from 'zod';
import { readNote } from '../notes';
import type { Config, Tool } from '../types';
import { noteIdSchema } from './note_schema';
import { tool } from './tool';

export function readNoteTool(config: Config): Tool {
	return tool({
		name: 'read_note',
		description: 'Read a persistent note by ID, including its content and metadata.',
		defaultPermission: 'allow',
		inputSchema: z.object({ id: noteIdSchema }),
		execute: ({ id }) => readNote(config, id) ?? { error: `Note '${id}' not found.` },
	});
}
