import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AgentTool } from './types';
import { textResult } from './types';

function expandUser(p: string): string {
	if (p.startsWith('~')) return path.join(os.homedir(), p.slice(1));
	return p;
}

function isInsidePath(root: string, target: string): boolean {
	const relative = path.relative(path.resolve(root), path.resolve(target));
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveAbs(workspace: string, target: string, workspaceOnly = false): string {
	const expanded = expandUser(target);
	const resolved = path.isAbsolute(expanded) ? path.resolve(expanded) : path.resolve(workspace, expanded);
	if (workspaceOnly && !isInsidePath(workspace, resolved)) {
		throw new Error('Path is outside the workspace.');
	}
	return resolved;
}

interface ReadArgs {
	path: string;
	offset?: number;
	limit?: number;
}

const DEFAULT_READ_LIMIT = 2000;

export const readTool: AgentTool<ReadArgs> = {
	name: 'read',
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
		const abs = resolveAbs(ctx.workspace, args.path, ctx.fsPolicy?.workspaceOnly === true);
		try {
			const stat = await fs.stat(abs);
			if (!stat.isFile()) return textResult(`read: ${args.path} is not a file`, true);
			const raw = await fs.readFile(abs, 'utf8');
			ctx.readState.set(abs, { mtimeMs: stat.mtimeMs, size: stat.size });
			const lines = raw.split('\n');
			const start = Math.max(1, args.offset ?? 1);
			const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_READ_LIMIT, 50_000));
			const slice = lines.slice(start - 1, start - 1 + limit);
			const numbered = slice.map((line, i) => `${String(start + i).padStart(6, ' ')}\t${line}`);
			const trailer =
				lines.length > start - 1 + limit
					? `\n... (${lines.length - (start - 1 + limit)} more lines)`
					: '';
			return textResult(`# ${abs}\n${numbered.join('\n')}${trailer}`);
		} catch (err) {
			return textResult(`read: ${(err as Error).message}`, true);
		}
	},
};

interface WriteArgs {
	path: string;
	content: string;
}

export const writeTool: AgentTool<WriteArgs> = {
	name: 'write',
	description:
		'Write a UTF-8 file (overwrites existing). If the file already exists you must have called `read` on it earlier in this run. Creates parent dirs.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string' },
			content: { type: 'string' },
		},
		required: ['path', 'content'],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly) return textResult('write: disabled by read-only filesystem policy.', true);
		const abs = resolveAbs(ctx.workspace, args.path, ctx.fsPolicy?.workspaceOnly === true);
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
					`write: must read ${args.path} before overwriting (read-before-write rule).`,
					true
				);
			}
			if (stat && (stat.mtimeMs !== last.mtimeMs || stat.size !== last.size)) {
				return textResult(
					`write: ${args.path} changed on disk since last read. Re-read first.`,
					true
				);
			}
		}
		try {
			await fs.mkdir(path.dirname(abs), { recursive: true });
			await fs.writeFile(abs, args.content, 'utf8');
			const after = await fs.stat(abs);
			ctx.readState.set(abs, { mtimeMs: after.mtimeMs, size: after.size });
			return textResult(`wrote ${abs} (${after.size} bytes)`);
		} catch (err) {
			return textResult(`write: ${(err as Error).message}`, true);
		}
	},
};

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
	needsApproval: true,
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly) return textResult('edit: disabled by read-only filesystem policy.', true);
		const abs = resolveAbs(ctx.workspace, args.path, ctx.fsPolicy?.workspaceOnly === true);
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
		ctx.readState.set(abs, { mtimeMs: after.mtimeMs, size: after.size });
		return textResult(`edited ${abs} (${count} replacement${count === 1 ? '' : 's'})`);
	},
};

interface ApplyPatchArgs {
	diff: string;
}

interface PatchFile {
	path: string;
	hunks: Array<{ oldStart: number; lines: string[] }>;
}

export const applyPatchTool: AgentTool<ApplyPatchArgs> = {
	name: 'apply_patch',
	description:
		'Apply a unified diff to workspace files. Use after reading affected files. Fails on context conflicts.',
	schema: {
		type: 'object',
		properties: {
			diff: { type: 'string', description: 'Unified diff text.' },
		},
		required: ['diff'],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly) {
			return textResult('apply_patch: disabled by read-only filesystem policy.', true);
		}
		try {
			const patches = parseUnifiedDiff(String(args.diff ?? ''));
			if (patches.length === 0) return textResult('apply_patch: no file patches found', true);
			const changed: string[] = [];
			for (const patch of patches) {
				const abs = resolveAbs(ctx.workspace, patch.path, ctx.fsPolicy?.workspaceOnly !== false);
				const stat = await fs.stat(abs);
				const last = ctx.readState.get(abs);
				if (!last) return textResult(`apply_patch: must read ${patch.path} before patching.`, true);
				if (stat.mtimeMs !== last.mtimeMs || stat.size !== last.size) {
					return textResult(`apply_patch: ${patch.path} changed on disk since last read.`, true);
				}
				const original = await fs.readFile(abs, 'utf8');
				const next = applyFilePatch(original, patch);
				await fs.writeFile(abs, next, 'utf8');
				const after = await fs.stat(abs);
				ctx.readState.set(abs, { mtimeMs: after.mtimeMs, size: after.size });
				changed.push(patch.path);
			}
			return textResult(`patched ${changed.join(', ')}`);
		} catch (err) {
			return textResult(`apply_patch: ${(err as Error).message}`, true);
		}
	},
};

function parseUnifiedDiff(diff: string): PatchFile[] {
	const lines = diff.split(/\r?\n/);
	const files: PatchFile[] = [];
	let current: PatchFile | null = null;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? '';
		if (line.startsWith('+++ ')) {
			const raw = line.slice(4).trim().split(/\s+/)[0] ?? '';
			const normalized = raw.replace(/^b\//, '');
			if (normalized === '/dev/null') throw new Error('creating files via apply_patch is not supported');
			current = { path: normalized, hunks: [] };
			files.push(current);
			continue;
		}
		if (!current || !line.startsWith('@@ ')) continue;
		const match = /^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/.exec(line);
		if (!match) throw new Error(`invalid hunk header: ${line}`);
		const hunkLines: string[] = [];
		for (i++; i < lines.length; i++) {
			const hunkLine = lines[i] ?? '';
			if (hunkLine.startsWith('@@ ') || hunkLine.startsWith('--- ') || hunkLine.startsWith('+++ ')) {
				i--;
				break;
			}
			if (hunkLine === '\\ No newline at end of file') continue;
			if (![' ', '+', '-'].includes(hunkLine[0] ?? '')) throw new Error(`invalid patch line: ${hunkLine}`);
			hunkLines.push(hunkLine);
		}
		current.hunks.push({ oldStart: Number(match[1]), lines: hunkLines });
	}
	return files;
}

function applyFilePatch(original: string, patch: PatchFile): string {
	const hasTrailingNewline = original.endsWith('\n');
	const originalLines = original.split('\n');
	if (hasTrailingNewline) originalLines.pop();
	const out: string[] = [];
	let cursor = 0;
	for (const hunk of patch.hunks) {
		const target = hunk.oldStart - 1;
		if (target < cursor) throw new Error(`overlapping hunk in ${patch.path}`);
		out.push(...originalLines.slice(cursor, target));
		cursor = target;
		for (const line of hunk.lines) {
			const marker = line[0];
			const text = line.slice(1);
			if (marker === ' ') {
				if (originalLines[cursor] !== text) {
					throw new Error(`context mismatch in ${patch.path} near line ${cursor + 1}`);
				}
				out.push(text);
				cursor++;
			} else if (marker === '-') {
				if (originalLines[cursor] !== text) {
					throw new Error(`removal mismatch in ${patch.path} near line ${cursor + 1}`);
				}
				cursor++;
			} else if (marker === '+') {
				out.push(text);
			}
		}
	}
	out.push(...originalLines.slice(cursor));
	return out.join('\n') + (hasTrailingNewline ? '\n' : '');
}

interface FindArgs {
	pattern: string;
	path?: string;
	limit?: number;
}

const DEFAULT_FIND_LIMIT = 1000;
const FIND_EXCLUDES = ['**/node_modules/**', '**/.git/**'];

export const findTool: AgentTool<FindArgs> = {
	name: 'find',
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
		if (!pattern) return textResult('find: pattern required', true);
		const dir = args.path ? resolveAbs(ctx.workspace, args.path, ctx.fsPolicy?.workspaceOnly === true) : ctx.workspace;
		const limit = typeof args.limit === 'number' && args.limit > 0 ? args.limit : DEFAULT_FIND_LIMIT;
		try {
			const stat = await fs.stat(dir).catch(() => null);
			if (!stat || !stat.isDirectory()) return textResult(`find: not a directory: ${dir}`, true);
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
			return textResult(`find: ${(err as Error).message}`, true);
		}
	},
};
