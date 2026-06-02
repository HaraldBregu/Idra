import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { TOOL_LIMITS } from './base/limits';
import { resolveAbs } from './common';

interface SearchFilesArgs {
	pattern: string;
	path?: string;
	limit?: number;
}

const DEFAULT_FIND_LIMIT = TOOL_LIMITS.find.defaultLimit;
const FIND_EXCLUDES = ['**/node_modules/**', '**/.git/**'];

export const searchFilesTool: AgentTool<SearchFilesArgs> = {
	name: 'search_files',
	description:
		'Find files by glob pattern (e.g. "**/*.ts"). Returns matching paths relative to the search directory.',
	schema: {
		type: 'object',
		properties: {
			pattern: { type: 'string' },
			path: { type: 'string', description: 'Directory to search; defaults to workspace.' },
			limit: { type: 'number' },
		},
		required: ['pattern'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const pattern = String(args.pattern ?? '').trim();
		if (!pattern) return textResult('search_files: pattern required', true);
		const limit =
			typeof args.limit === 'number' && args.limit > 0
				? Math.min(Math.floor(args.limit), TOOL_LIMITS.find.maxLimit)
				: DEFAULT_FIND_LIMIT;
		try {
			const dir = args.path
				? resolveAbs(ctx.workspace, args.path)
				: ctx.workspace;
			const stat = await fs.stat(dir).catch(() => null);
			if (!stat || !stat.isDirectory()) return textResult(`search_files: not a directory: ${dir}`, true);
			const results: string[] = [];
			const iter = fs.glob(pattern, { cwd: dir, exclude: FIND_EXCLUDES, withFileTypes: true });
			for await (const dirent of iter) {
				const full = path.join(dirent.parentPath, dirent.name);
				let rel = path.relative(dir, full) || dirent.name;
				if (dirent.isDirectory() && !rel.endsWith('/')) rel += '/';
				results.push(rel.split(path.sep).join('/'));
				if (results.length >= limit) break;
			}
			return textResult(results.length === 0 ? 'No matches.' : results.join('\n'));
		} catch (err) {
			return textResult(`search_files: ${(err as Error).message}`, true);
		}
	},
};
