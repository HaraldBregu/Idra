import type { AgentTool } from '../core/types';
import { writeTool } from '../files/tools';
import { toolDescription } from '../metadata';
import { pushUndo, snapshotTarget } from './undo_last_operation';

type WriteFileArgs = Parameters<typeof writeTool.execute>[0];

export const writeFileTool: AgentTool<WriteFileArgs> = {
	...writeTool,
	name: 'write_file',
	description: toolDescription('write_file'),
	async execute(args, ctx) {
		const before = await snapshotTarget(ctx, args.path).catch(() => null);
		const result = await writeTool.execute(args, ctx);
		if (result.status === 'ok' && before && before.before.kind !== 'other') {
			pushUndo(ctx, before);
		}
		return result;
	},
};
