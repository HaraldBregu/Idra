import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { toolDescription } from '../metadata';
import { restoreLastUndo } from './undo-store';

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
		if (ctx.fsPolicy?.readOnly) {
			return textResult('undo_last_operation: disabled by read-only filesystem policy.', true);
		}
		try {
			return textResult(await restoreLastUndo(ctx));
		} catch (error) {
			return textResult(`undo_last_operation: ${(error as Error).message}`, true);
		}
	},
};
