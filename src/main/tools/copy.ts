import { constants as fsConstants, promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { requireReadSnapshot, resolveAbs, snapshot } from './shared/common';

interface CopyArgs {
	source: string;
	destination: string;
	overwrite?: boolean;
}

export const copyTool: AgentTool<CopyArgs> = {
	name: 'copy',
	description:
		'Copy one file or directory to another path. Creates parent dirs. Set overwrite=true only after reading the destination file.',
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
		if (ctx.fsPolicy?.readOnly)
			return textResult('copy: disabled by read-only filesystem policy.', true);
		let sourceAbs: string;
		let destinationAbs: string;
		try {
			sourceAbs = resolveAbs(ctx.workspace, args.source);
			destinationAbs = resolveAbs(ctx.workspace, args.destination);
		} catch (err) {
			return textResult(`copy: ${(err as Error).message}`, true);
		}
		if (sourceAbs === destinationAbs)
			return textResult('copy: source and destination are identical.', true);
		try {
			const sourceStat = await fs.stat(sourceAbs);
			const destinationStat = await fs.stat(destinationAbs).catch(() => null);
			if (sourceStat.isDirectory()) {
				if (destinationStat)
					return textResult(`copy: destination exists: ${args.destination}`, true);
				await fs.cp(sourceAbs, destinationAbs, {
					recursive: true,
					errorOnExist: true,
					force: false,
				});
				return textResult(`copied directory ${sourceAbs} to ${destinationAbs}`);
			}
			if (!sourceStat.isFile()) return textResult(`copy: unsupported source type: ${args.source}`, true);
			if (destinationStat) {
				if (!args.overwrite)
					return textResult(`copy: destination exists: ${args.destination}`, true);
				if (!destinationStat.isFile())
					return textResult(`copy: destination is not a file: ${args.destination}`, true);
				const blocked = requireReadSnapshot(
					ctx,
					destinationAbs,
					destinationStat,
					args.destination,
					'copy'
				);
				if (blocked) return textResult(blocked, true);
			}
			await fs.mkdir(path.dirname(destinationAbs), { recursive: true });
			await fs.copyFile(sourceAbs, destinationAbs, args.overwrite ? 0 : fsConstants.COPYFILE_EXCL);
			const after = await fs.stat(destinationAbs);
			ctx.readState.set(destinationAbs, snapshot(after));
			return textResult(`copied ${sourceAbs} to ${destinationAbs} (${after.size} bytes)`);
		} catch (err) {
			return textResult(`copy: ${(err as Error).message}`, true);
		}
	},
};
