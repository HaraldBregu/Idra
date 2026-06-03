import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { resolveAbs, snapshot } from './shared/common';
import { pushUndo, snapshotTarget } from './shared/undo-store';

interface WriteArgs {
	path: string;
	content: string;
}

export const fileWriteTool: AgentTool<WriteArgs> = {
	name: 'file_write',
	description:
		'Create or write a UTF-8 file (overwrites existing). If the file already exists you must have called `file_read` on it earlier in this run. Creates parent dirs.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string' },
			content: { type: 'string' },
		},
		required: ['path', 'content'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const before = await snapshotTarget(ctx, args.path).catch(() => null);
		let abs: string;
		try {
			abs = resolveAbs(ctx.workspace, args.path);
		} catch (err) {
			return textResult(`file_write: ${(err as Error).message}`, true);
		}
		let exists = false;
		let stat: { mtimeMs: number; size: number } | null = null;
		try {
			const s = await fs.stat(abs);
			exists = s.isFile();
			stat = { mtimeMs: s.mtimeMs, size: s.size };
		} catch {
			/* new file */
		}
		if (exists) {
			const last = ctx.readState.get(abs);
			if (!last) {
				return textResult(
					`file_write: must read ${args.path} before overwriting (read-before-write rule).`,
					true
				);
			}
			if (stat && (stat.mtimeMs !== last.mtimeMs || stat.size !== last.size)) {
				return textResult(
					`file_write: ${args.path} changed on disk since last read. Re-read first.`,
					true
				);
			}
		}
		try {
			await fs.mkdir(path.dirname(abs), { recursive: true });
			await fs.writeFile(abs, args.content, 'utf8');
			const after = await fs.stat(abs);
			ctx.readState.set(abs, snapshot(after));
			if (before && before.before.kind !== 'other') pushUndo(ctx, before);
			return textResult(`wrote ${abs} (${after.size} bytes)`);
		} catch (err) {
			return textResult(`file_write: ${(err as Error).message}`, true);
		}
	},
};
