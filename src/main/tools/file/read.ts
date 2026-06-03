import { promises as fs } from 'node:fs';
import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { TOOL_LIMITS } from '../base/limits';
import { resolveAbs } from '../shared/common';

interface ReadArgs {
	path: string;
	offset?: number;
	limit?: number;
}

const DEFAULT_READ_LIMIT = TOOL_LIMITS.read.defaultLines;

export const fileReadTool: AgentTool<ReadArgs> = {
	name: 'file_read',
	description:
		'Read a UTF-8 file. Returns content with 1-indexed line-number prefixes. Default cap 2000 lines.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string', description: 'Absolute or workspace-relative path.' },
			offset: { type: 'number', description: '1-indexed line to start at.' },
			limit: { type: 'number', description: 'Max lines to read (default 2000).' },
		},
		required: ['path'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		try {
			const abs = resolveAbs(ctx.workspace, args.path);
			const stat = await fs.stat(abs);
			if (!stat.isFile()) return textResult(`file_read: ${args.path} is not a file`, true);
			const raw = await fs.readFile(abs, 'utf8');
			ctx.readState.set(abs, { mtimeMs: stat.mtimeMs, size: stat.size });
			const lines = raw.split('\n');
			const start = Math.max(1, args.offset ?? 1);
			const limit = Math.max(
				1,
				Math.min(args.limit ?? DEFAULT_READ_LIMIT, TOOL_LIMITS.read.maxLines)
			);
			const slice = lines.slice(start - 1, start - 1 + limit);
			const numbered = slice.map((line, i) => `${String(start + i).padStart(6, ' ')}\t${line}`);
			const truncated = lines.length > start - 1 + limit;
			const trailer =
				truncated
					? `\n... (${lines.length - (start - 1 + limit)} more lines)`
					: '';
			return {
				status: 'ok',
				content: [{ type: 'text', text: `# ${abs}\n${numbered.join('\n')}${trailer}` }],
				details: {
					path: args.path,
					absolutePath: abs,
					offset: start,
					lineCount: slice.length,
					truncated,
					size: stat.size,
				},
			};
		} catch (err) {
			return textResult(`file_read: ${(err as Error).message}`, true);
		}
	},
};
