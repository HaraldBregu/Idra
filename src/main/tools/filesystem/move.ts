import { constants as fsConstants, promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { requireReadSnapshot, resolveAbs, snapshot } from './shared/common';

interface MoveArgs {
	source: string;
	destination: string;
	overwrite?: boolean;
}

export const moveTool: AgentTool<MoveArgs> = {
	name: 'move',
	description:
		'Move or rename one file. The source must be read earlier in this run. Set overwrite=true only after reading the destination file.',
	schema: {
		type: 'object',
		properties: {
			source: { type: 'string' },
			destination: { type: 'string' },
			overwrite: { type: 'boolean' },
		},
		required: ['source', 'destination'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		let sourceAbs: string;
		let destinationAbs: string;
		try {
			sourceAbs = resolveAbs(ctx.workspace, args.source);
			destinationAbs = resolveAbs(ctx.workspace, args.destination);
		} catch (err) {
			return textResult(`move: ${(err as Error).message}`, true);
		}
		if (sourceAbs === destinationAbs)
			return textResult('move: source and destination are identical.', true);
		try {
			const sourceStat = await fs.stat(sourceAbs);
			if (!sourceStat.isFile())
				return textResult(`move: source is not a file: ${args.source}`, true);
			const sourceBlocked = requireReadSnapshot(ctx, sourceAbs, sourceStat, args.source, 'move');
			if (sourceBlocked) return textResult(sourceBlocked, true);
			const destinationStat = await fs.stat(destinationAbs).catch(() => null);
			if (destinationStat) {
				if (!args.overwrite)
					return textResult(`move: destination exists: ${args.destination}`, true);
				if (!destinationStat.isFile())
					return textResult(`move: destination is not a file: ${args.destination}`, true);
				const destinationBlocked = requireReadSnapshot(
					ctx,
					destinationAbs,
					destinationStat,
					args.destination,
					'move'
				);
				if (destinationBlocked) return textResult(destinationBlocked, true);
				await fs.rm(destinationAbs);
			}
			await fs.mkdir(path.dirname(destinationAbs), { recursive: true });
			try {
				await fs.rename(sourceAbs, destinationAbs);
			} catch (err) {
				if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
				await fs.copyFile(sourceAbs, destinationAbs, fsConstants.COPYFILE_EXCL);
				await fs.rm(sourceAbs);
			}
			const after = await fs.stat(destinationAbs);
			ctx.readState.delete(sourceAbs);
			ctx.readState.set(destinationAbs, snapshot(after));
			return textResult(`moved ${sourceAbs} to ${destinationAbs} (${after.size} bytes)`);
		} catch (err) {
			return textResult(`move: ${(err as Error).message}`, true);
		}
	},
};
