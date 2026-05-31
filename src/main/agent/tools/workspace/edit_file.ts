import type { AgentTool } from '../core/types';
import { editTool } from '../files/tools';
import { toolDescription } from '../metadata';
import { pushUndo, snapshotTarget } from './undo_last_operation';

type EditFileArgs = Parameters<typeof editTool.execute>[0];

export const editFileTool: AgentTool<EditFileArgs> = {
	...editTool,
	name: 'edit_file',
	description: toolDescription('edit_file'),
	async execute(args, ctx) {
		const before = await snapshotTarget(ctx, args.path).catch(() => null);
		const result = await editTool.execute(args, ctx);
		if (result.status === 'ok' && before && before.before.kind === 'file') {
			pushUndo(ctx, before);
		}
		return result;
	},
};
