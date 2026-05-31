import { promises as fs } from 'node:fs';
import type { AgentTool, ToolContext } from '../core/types';
import { textResult } from '../core/types';
import { toolDescription } from '../metadata';
import { resolveAbs } from './path';

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

export const undoLastOperationTool: AgentTool = {
	name: 'undo_last_operation',
	description: toolDescription('undo_last_operation'),
	schema: {
		type: 'object',
		properties: {},
		required: [],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(_args, ctx) {
		if (ctx.fsPolicy?.readOnly) {
			return textResult('undo_last_operation: disabled by read-only filesystem policy.', true);
		}
		const entry = undoStacks.get(ctx)?.pop();
		if (!entry) return textResult('undo_last_operation: no reversible operation recorded.', true);
		try {
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
			return textResult(`undid last operation on ${entry.path}`);
		} catch (error) {
			return textResult(`undo_last_operation: ${(error as Error).message}`, true);
		}
	},
};

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
