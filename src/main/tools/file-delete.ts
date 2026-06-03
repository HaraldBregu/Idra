import { promises as fs } from 'node:fs';
import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { resolveAbs } from './shared/common';

interface DeleteArgs {
	path: string;
	recursive?: boolean;
}

export const fileDeleteTool: AgentTool<DeleteArgs> = {
	name: 'file_delete',
	description:
		'Delete a file directly by absolute or workspace-relative path. Directories require recursive=true.',
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
			return textResult(`file_delete: ${(err as Error).message}`, true);
		}
		try {
			const stat = await fs.stat(abs);
			if (stat.isDirectory()) {
				if (!args.recursive)
					return textResult('file_delete: recursive=true is required for directories.', true);
				await fs.rm(abs, { recursive: true });
				return textResult(`deleted directory ${abs}`);
			}
			if (!stat.isFile()) return textResult(`file_delete: unsupported file type: ${args.path}`, true);
			await fs.rm(abs);
			ctx.readState.delete(abs);
			return textResult(`deleted ${abs}`);
		} catch (err) {
			return textResult(`file_delete: ${(err as Error).message}`, true);
		}
	},
};
