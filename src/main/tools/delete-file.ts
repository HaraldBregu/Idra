import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { requireReadSnapshot, resolveAbs } from './shared/common';

interface DeleteArgs {
	path: string;
	recursive?: boolean;
}

export const deleteFileTool: AgentTool<DeleteArgs> = {
	name: 'delete_file',
	description:
		'Delete a file by absolute or workspace-relative path. Files must be read with read_file earlier in the same run before deletion; prior conversation reads do not count. Directories require recursive=true and cannot target root paths.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string', description: 'Absolute or workspace-relative path.' },
			recursive: { type: 'boolean', description: 'Required to delete a directory tree.' },
		},
		required: ['path'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		let abs: string;
		try {
			abs = resolveAbs(ctx.workspace, args.path);
		} catch (err) {
			return textResult(`delete_file: ${(err as Error).message}`, true);
		}
		try {
			const stat = await fs.stat(abs);
			if (stat.isDirectory()) {
				if (!args.recursive)
					return textResult('delete_file: recursive=true is required for directories.', true);
				if (isProtectedDirectory(abs, ctx.workspace)) {
					return textResult('delete_file: refusing to delete a root directory.', true);
				}
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

function isProtectedDirectory(abs: string, workspace: string): boolean {
	const normalized = path.resolve(abs);
	return normalized === path.parse(normalized).root || normalized === path.resolve(workspace);
}
