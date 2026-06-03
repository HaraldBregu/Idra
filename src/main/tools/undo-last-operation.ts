import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { toolDescription } from './base/metadata';
import { restoreLastUndo } from './shared/undo-store';

export const undoLastOperationTool: AgentTool = {
	name: 'undo_last_operation',
	description: toolDescription('undo_last_operation'),
	schema: {
		type: 'object',
		properties: {},
		required: [],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(_args, ctx) {
		try {
			return textResult(await restoreLastUndo(ctx));
		} catch (error) {
			return textResult(`undo_last_operation: ${(error as Error).message}`, true);
		}
	},
};
