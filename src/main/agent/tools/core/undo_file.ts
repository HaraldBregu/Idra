import { z } from 'zod';
import { undoFileOperation } from '../../history/undo';
import { tool } from '../tool';

export const undoFileTool = tool({
	id: 'undo_file_operation',
	name: 'Undo file operation',
	description:
		'Undo the most recent write_file, edit_file, or apply_patch operation. Refuses if a file has changed since that operation.',
	hardApproval: true,
	inputSchema: z.object({}),
	execute: () => {
		const operation = undoFileOperation();
		return { operationId: operation.id, toolName: operation.toolName, restored: operation.before.map((file) => file.path) };
	},
});
