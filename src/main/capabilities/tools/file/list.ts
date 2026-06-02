import { promises as fs } from 'node:fs';
import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { toolDescription } from '../base/metadata';
import { resolveAbs } from './common';

interface ListDirectoryArgs {
	path?: string;
	limit?: number;
}

const DEFAULT_LIST_LIMIT = 200;
const MAX_LIST_LIMIT = 2000;

export const listDirectoryTool: AgentTool<ListDirectoryArgs> = {
	name: 'list_directory',
	description: toolDescription('list_directory'),
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string', description: 'Directory to list; defaults to workspace.' },
			limit: { type: 'number', description: 'Maximum entries to return.' },
		},
		required: [],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		let abs: string;
		try {
			abs = args.path ? resolveAbs(ctx.workspace, args.path) : ctx.workspace;
		} catch (err) {
			return textResult(`list_directory: ${(err as Error).message}`, true);
		}
		try {
			const stat = await fs.stat(abs);
			if (!stat.isDirectory()) return textResult(`list_directory: not a directory: ${abs}`, true);
			const limit =
				typeof args.limit === 'number' && args.limit > 0
					? Math.min(Math.floor(args.limit), MAX_LIST_LIMIT)
					: DEFAULT_LIST_LIMIT;
			const entries = await fs.readdir(abs, { withFileTypes: true });
			const visible: string[] = [];
			for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
				visible.push(`${entry.name}${entry.isDirectory() ? '/' : ''}`);
				if (visible.length >= limit) break;
			}
			return textResult(visible.length === 0 ? 'No entries.' : visible.join('\n'));
		} catch (err) {
			return textResult(`list_directory: ${(err as Error).message}`, true);
		}
	},
};
