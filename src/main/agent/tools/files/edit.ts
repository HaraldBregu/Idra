import { promises as fs } from 'node:fs';
import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { resolveAbs, snapshot } from './common';

interface EditArgs {
	path: string;
	old: string;
	new: string;
	replaceAll?: boolean;
}

export const editTool: AgentTool<EditArgs> = {
	name: 'edit',
	description:
		'Exact-string replacement in a UTF-8 file. Fails if `old` is not unique unless replaceAll=true. Read the file first.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string' },
			old: { type: 'string' },
			new: { type: 'string' },
			replaceAll: { type: 'boolean' },
		},
		required: ['path', 'old', 'new'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly)
			return textResult('edit: disabled by read-only filesystem policy.', true);
		let abs: string;
		try {
			abs = resolveAbs(ctx.workspace, args.path);
		} catch (err) {
			return textResult(`edit: ${(err as Error).message}`, true);
		}
		if (args.old === args.new) return textResult('edit: old and new are identical', true);
		let stat;
		try {
			stat = await fs.stat(abs);
		} catch {
			return textResult(`edit: file does not exist: ${args.path}`, true);
		}
		const last = ctx.readState.get(abs);
		if (!last) return textResult(`edit: must read ${args.path} before editing.`, true);
		if (stat.mtimeMs !== last.mtimeMs || stat.size !== last.size) {
			return textResult(`edit: ${args.path} changed on disk since last read. Re-read first.`, true);
		}
		const original = await fs.readFile(abs, 'utf8');
		let next: string;
		let count = 0;
		if (args.replaceAll) {
			let scan = 0;
			while ((scan = original.indexOf(args.old, scan)) !== -1) {
				count++;
				scan += args.old.length;
			}
			if (count === 0) return textResult('edit: old string not found', true);
			next = original.split(args.old).join(args.new);
		} else {
			const idx = original.indexOf(args.old);
			if (idx === -1) return textResult('edit: old string not found', true);
			if (original.indexOf(args.old, idx + args.old.length) !== -1) {
				return textResult(
					'edit: old string not unique. Provide more surrounding context or set replaceAll.',
					true
				);
			}
			next = original.slice(0, idx) + args.new + original.slice(idx + args.old.length);
			count = 1;
		}
		await fs.writeFile(abs, next, 'utf8');
		const after = await fs.stat(abs);
		ctx.readState.set(abs, snapshot(after));
		return textResult(`edited ${abs} (${count} replacement${count === 1 ? '' : 's'})`);
	},
};
