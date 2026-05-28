import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentTool, ToolContext } from './types';
import { textResult } from './types';

function resolveWorkspace(ctx: ToolContext, target: unknown): string {
	if (typeof target !== 'string' || !target.trim()) throw new Error('path is required.');
	const root = path.resolve(ctx.workspace);
	const resolved = path.resolve(root, target);
	const relative = path.relative(root, resolved);
	if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('path is outside workspace.');
	return resolved;
}

export const readTool: AgentTool = {
	name: 'read_file',
	description: 'Read a text file in the workspace.',
	schema: { type: 'object', required: ['path'], properties: { path: { type: 'string' } } },
	async execute(args, ctx) {
		const file = resolveWorkspace(ctx, args.path);
		const stat = await fs.stat(file);
		ctx.readState.set(file, { mtimeMs: stat.mtimeMs, size: stat.size });
		return textResult(await fs.readFile(file, 'utf8'));
	},
};

export const writeTool: AgentTool = {
	name: 'write_file',
	description: 'Write a text file in the workspace.',
	schema: {
		type: 'object',
		required: ['path', 'content'],
		properties: { path: { type: 'string' }, content: { type: 'string' } },
	},
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly) return textResult('Filesystem is read-only for this run.', true);
		if (typeof args.content !== 'string') throw new Error('content is required.');
		const file = resolveWorkspace(ctx, args.path);
		await fs.mkdir(path.dirname(file), { recursive: true });
		await fs.writeFile(file, args.content, 'utf8');
		return textResult(`wrote ${path.relative(ctx.workspace, file)}`);
	},
};

export const listTool: AgentTool = {
	name: 'list_files',
	description: 'List workspace files.',
	schema: { type: 'object', properties: { path: { type: 'string' } } },
	async execute(args, ctx) {
		const dir = resolveWorkspace(ctx, typeof args.path === 'string' ? args.path : '.');
		const entries = await fs.readdir(dir);
		return textResult(entries.join('\n'));
	},
};
