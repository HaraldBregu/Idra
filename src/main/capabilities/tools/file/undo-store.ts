import { promises as fs } from 'node:fs';
import type { ToolContext } from '../base/tool';
import { resolveAbs } from './common';

type Snapshot =
	| { kind: 'missing' }
	| { kind: 'file'; content: string; mtimeMs: number; size: number }
	| { kind: 'other' };

type UndoEntry = {
	path: string;
	abs: string;
	before: Snapshot;
};

const undoStacks = new WeakMap<ToolContext, UndoEntry[]>();

export async function snapshotTarget(ctx: ToolContext, target: unknown): Promise<UndoEntry> {
	if (typeof target !== 'string') return { path: String(target), abs: '', before: { kind: 'other' } };
	const abs = resolveAbs(ctx.workspace, target);
	const stat = await fs.stat(abs).catch((error: NodeJS.ErrnoException) => {
		if (error.code === 'ENOENT') return null;
		throw error;
	});
	if (!stat) return { path: target, abs, before: { kind: 'missing' } };
	if (!stat.isFile()) return { path: target, abs, before: { kind: 'other' } };
	return {
		path: target,
		abs,
		before: {
			kind: 'file',
			content: await fs.readFile(abs, 'utf8'),
			mtimeMs: stat.mtimeMs,
			size: stat.size,
		},
	};
}

export function pushUndo(ctx: ToolContext, entry: UndoEntry): void {
	const stack = undoStacks.get(ctx) ?? [];
	stack.push(entry);
	undoStacks.set(ctx, stack.slice(-20));
}

export async function restoreLastUndo(ctx: ToolContext): Promise<string> {
	const entry = undoStacks.get(ctx)?.pop();
	if (!entry) return 'undo_last_operation: no reversible operation recorded.';
	if (entry.before.kind === 'missing') {
		await fs.rm(entry.abs, { force: true });
		ctx.readState.delete(entry.abs);
	} else if (entry.before.kind === 'file') {
		await fs.writeFile(entry.abs, entry.before.content, 'utf8');
		ctx.readState.set(entry.abs, {
			mtimeMs: entry.before.mtimeMs,
			size: entry.before.size,
		});
	}
	return `undid last operation on ${entry.path}`;
}
