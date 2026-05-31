import { promises as fs } from 'node:fs';
import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { guardedRootMessage, requireReadSnapshot, resolveAbs } from './common';

interface DeleteArgs {
	path: string;
	recursive?: boolean;
}

export const deleteFileTool: AgentTool<DeleteArgs> = {
	name: 'delete_file',
	description:
		'Delete a file. Files must be read earlier in this run before deletion. Directories require recursive=true and cannot target root paths.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string' },
			recursive: { type: 'boolean', description: 'Required to delete a directory tree.' },
		},
		required: ['path'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly)
			return textResult('delete_file: disabled by read-only filesystem policy.', true);
		let abs: string;
		try {
			abs = resolveAbs(ctx.workspace, args.path);
		} catch (err) {
			return textResult(`delete_file: ${(err as Error).message}`, true);
		}
		const guard = guardedRootMessage(ctx.workspace, abs);
		if (guard) return textResult(`delete_file: ${guard}.`, true);
		try {
			const stat = await fs.stat(abs);
			if (stat.isDirectory()) {
				if (!args.recursive)
					return textResult('delete_file: recursive=true is required for directories.', true);
				await fs.rm(abs, { recursive: true });
				return textResult(`deleted directory ${abs}`);
			}
			if (!stat.isFile()) return textResult(`delete_file: unsupported file type: ${args.path}`, true);
			const blocked = requireReadSnapshot(ctx, abs, stat, args.path, 'delete_file');
			if (blocked) return textResult(blocked, true);
			await fs.rm(abs);
			ctx.readState.delete(abs);
			return textResult(`deleted ${abs}`);
		} catch (err) {
			return textResult(`delete_file: ${(err as Error).message}`, true);
		}
	},
};
