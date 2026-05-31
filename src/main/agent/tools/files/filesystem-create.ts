import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { resolveAbs, snapshot } from './common';

interface FilesystemCreateArgs {
	path: string;
	content: string;
}

export const filesystemCreateTool: AgentTool<FilesystemCreateArgs> = {
	name: 'filesystem_create',
	description: 'Create a UTF-8 file. Fails if the target already exists.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string', description: 'Absolute or workspace-relative path.' },
			content: { type: 'string' },
		},
		required: ['path', 'content'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly) {
			return textResult('filesystem_create: disabled by read-only filesystem policy.', true);
		}
		let abs: string;
		try {
			abs = resolveAbs(ctx.workspace, args.path);
		} catch (err) {
			return textResult(`filesystem_create: ${(err as Error).message}`, true);
		}
		try {
			await fs.mkdir(path.dirname(abs), { recursive: true });
			await fs.writeFile(abs, args.content, { encoding: 'utf8', flag: 'wx' });
			const after = await fs.stat(abs);
			ctx.readState.set(abs, snapshot(after));
			return textResult(`created ${abs} (${after.size} bytes)`);
		} catch (err) {
			return textResult(`filesystem_create: ${(err as Error).message}`, true);
		}
	},
};
