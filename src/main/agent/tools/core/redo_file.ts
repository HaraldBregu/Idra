import { z } from 'zod';
import { redoFileOperation } from '../../history/redo';
import { tool } from '../tool';

export const redoFileTool = tool({
	id: 'redo_file_operation',
	name: 'Redo file operation',
	description:
		'Redo the most recently undone file operation. Refuses if a file has changed since it was undone.',
	hardApproval: true,
	inputSchema: z.object({}),
	execute: () => {
		const operation = redoFileOperation();
		return { operationId: operation.id, toolName: operation.toolName, restored: operation.after.map((file) => file.path) };
	},
});
