import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { resolveAbs } from './shared/system-path';

export const grepTool: AgentTool<{
	pattern: string;
	path?: string;
	regex?: boolean;
	caseSensitive?: boolean;
	limit?: number;
}> = {
	name: 'grep',
	description: 'Search workspace file contents for text or regular expression matches.',
	schema: {
		type: 'object',
		properties: {
			pattern: { type: 'string' },
			path: { type: 'string', description: 'File or directory to search; defaults to workspace.' },
			regex: { type: 'boolean', description: 'Treat pattern as a JavaScript regular expression.' },
			caseSensitive: { type: 'boolean' },
			limit: { type: 'number' },
		},
		required: ['pattern'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const pattern = String(args.pattern ?? '');
		if (!pattern) return textResult('grep: pattern is required.', true);
		const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 100), 1000));
		let matcher: (line: string) => boolean;
		try {
			matcher = createMatcher(pattern, Boolean(args.regex), Boolean(args.caseSensitive));
		} catch (error) {
			return textResult(`grep: ${(error as Error).message}`, true);
		}

		try {
			const root = args.path ? resolveAbs(ctx.workspace, args.path) : ctx.workspace;
			const stat = await fs.stat(root);
			const files = stat.isFile() ? [root] : await collectFiles(root, limit * 20);
			const matches: string[] = [];
			for (const file of files) {
				const fileStat = await fs.stat(file).catch(() => null);
				if (!fileStat?.isFile()) continue;
				const text = await fs.readFile(file, 'utf8').catch(() => null);
				if (text === null) continue;
				const relative = path.relative(ctx.workspace, file) || path.basename(file);
				const lines = text.split('\n');
				for (let index = 0; index < lines.length; index++) {
					if (!matcher(lines[index] ?? '')) continue;
					matches.push(`${relative}:${index + 1}:${lines[index]}`);
					if (matches.length >= limit) return textResult(matches.join('\n'));
				}
			}
			return textResult(matches.length ? matches.join('\n') : 'No matches.');
		} catch (error) {
			return textResult(`grep: ${(error as Error).message}`, true);
		}
	},
};

function createMatcher(pattern: string, regex: boolean, caseSensitive: boolean): (line: string) => boolean {
	if (regex) {
		const expression = new RegExp(pattern, caseSensitive ? '' : 'i');
		return (line) => expression.test(line);
	}
	const needle = caseSensitive ? pattern : pattern.toLowerCase();
	return (line) => (caseSensitive ? line : line.toLowerCase()).includes(needle);
}

async function collectFiles(root: string, limit: number): Promise<string[]> {
	const files: string[] = [];
	const iter = fs.glob('**/*', {
		cwd: root,
		exclude: ['**/node_modules/**', '**/.git/**'],
		withFileTypes: true,
	});
	for await (const dirent of iter) {
		if (!dirent.isFile()) continue;
		files.push(path.join(dirent.parentPath, dirent.name));
		if (files.length >= limit) break;
	}
	return files;
}
