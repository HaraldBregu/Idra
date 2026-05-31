import { promises as fs } from 'node:fs';
import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { resolveAbs } from './common';

interface FilesystemListArgs {
	path?: string;
	limit?: number;
}

const DEFAULT_LIST_LIMIT = 200;
const MAX_LIST_LIMIT = 2000;

export const filesystemListTool: AgentTool<FilesystemListArgs> = {
	name: 'filesystem_list',
	description: 'List files and directories in a directory.',
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
			return textResult(`filesystem_list: ${(err as Error).message}`, true);
		}
		try {
			const stat = await fs.stat(abs);
			if (!stat.isDirectory()) return textResult(`filesystem_list: not a directory: ${abs}`, true);
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
			return textResult(`filesystem_list: ${(err as Error).message}`, true);
		}
	},
};
