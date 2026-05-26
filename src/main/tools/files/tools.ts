import { createHash } from 'node:crypto';
import { constants as fsConstants, promises as fs } from 'node:fs';
import type { Stats } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AgentTool, AgentToolResult, ToolContext } from '../core/types';
import { textResult } from '../core/types';
import { TOOL_LIMITS } from '../core/limits';
import {
	checkFilePolicy,
	filePolicyAllows,
	hasFilePolicy,
	type FilePolicyCheck,
} from './policy';
import type { Permission } from '../../../shared/policy';

function expandUser(p: string): string {
	if (p.startsWith('~')) return path.join(os.homedir(), p.slice(1));
	return p;
}

function isInsidePath(root: string, target: string): boolean {
	const relative = path.relative(path.resolve(root), path.resolve(target));
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveAbs(workspace: string, target: string): string {
	const expanded = expandUser(target);
	return path.isAbsolute(expanded)
		? path.resolve(expanded)
		: path.resolve(workspace, expanded);
}

// Returns an error message if fsPolicy explicitly restricts this path, null otherwise.
function checkFsRestriction(ctx: ToolContext, abs: string, toolName: string, isWrite: boolean): string | null {
	if (!isInsidePath(ctx.workspace, abs)) {
		if (ctx.fsPolicy?.workspaceOnly) return `${toolName}: path is outside the workspace.`;
		if (isWrite && ctx.fsPolicy?.writeWorkspaceOnly) return `${toolName}: path is outside the workspace.`;
	}
	return null;
}

function outsidePathNeedsApproval(
	ctx: ToolContext,
	target: string,
	permissions: readonly Permission[],
	mode: 'all' | 'any' = 'all'
): boolean {
	const abs = resolveAbs(ctx.workspace, target, false);
	if (isInsidePath(ctx.workspace, abs)) return false;
	const allowed =
		mode === 'all'
			? permissions.every((permission) => filePolicyAllows(ctx, abs, permission))
			: permissions.some((permission) => filePolicyAllows(ctx, abs, permission));
	return !allowed;
}

function snapshot(stat: Stats): { mtimeMs: number; size: number } {
	return { mtimeMs: stat.mtimeMs, size: stat.size };
}

function requireReadSnapshot(
	ctx: { readState: Map<string, { mtimeMs: number; size: number }> },
	abs: string,
	stat: Stats,
	label: string,
	action: string
): string | null {
	const last = ctx.readState.get(abs);
	if (!last)
		return `${action}: must read ${label} before ${action === 'delete' ? 'deleting' : 'overwriting'}.`;
	if (stat.mtimeMs !== last.mtimeMs || stat.size !== last.size) {
		return `${action}: ${label} changed on disk since last read. Re-read first.`;
	}
	return null;
}

function guardedRootMessage(workspace: string, abs: string): string | null {
	const resolved = path.resolve(abs);
	if (resolved === path.parse(resolved).root) return 'refusing to operate on filesystem root';
	if (resolved === path.resolve(workspace)) return 'refusing to operate on workspace root';
	if (resolved === path.resolve(os.homedir())) return 'refusing to operate on home directory';
	return null;
}

async function collectDirectoryCopyPolicyChecks(
	sourceAbs: string,
	destinationAbs: string
): Promise<FilePolicyCheck[]> {
	const checks: FilePolicyCheck[] = [
		{ path: sourceAbs, permission: 'read' },
		{ path: destinationAbs, permission: 'create' },
	];
	const entries = await fs.readdir(sourceAbs, { withFileTypes: true });
	for (const entry of entries) {
		const sourcePath = path.join(sourceAbs, entry.name);
		const destinationPath = path.join(destinationAbs, entry.name);
		checks.push({ path: sourcePath, permission: 'read' });
		checks.push({ path: destinationPath, permission: 'create' });
		if (entry.isDirectory()) {
			checks.push(...(await collectDirectoryCopyPolicyChecks(sourcePath, destinationPath)));
		}
	}
	return checks;
}

interface ReadArgs {
	path: string;
	offset?: number;
	limit?: number;
}

const DEFAULT_READ_LIMIT = TOOL_LIMITS.read.defaultLines;

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
		try {
			const abs = resolveAbs(ctx.workspace, args.path);
			const restricted = checkFsRestriction(ctx, abs, 'read', false);
			if (restricted) return textResult(restricted, true);
			const denied = checkFilePolicy(ctx, 'read', [{ path: abs, permission: 'read' }]);
			if (denied) return textResult(denied, true);
			const stat = await fs.stat(abs);
			if (!stat.isFile()) return textResult(`read: ${args.path} is not a file`, true);
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
		'Create or write a UTF-8 file (overwrites existing). If the file already exists you must have called `read` on it earlier in this run. Creates parent dirs.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string' },
			content: { type: 'string' },
		},
		required: ['path', 'content'],
		additionalProperties: false,
	},
	needsApproval: (args, ctx) =>
		outsidePathNeedsApproval(ctx, args.path, ['write', 'create'], 'any'),
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly) {
			return textResult('write: disabled by read-only filesystem policy.', true);
		}
		let abs: string;
		try {
			abs = resolveAbs(ctx.workspace, args.path);
		} catch (err) {
			return textResult(`write: ${(err as Error).message}`, true);
		}
		const writeRestricted = checkFsRestriction(ctx, abs, 'write', true);
		if (writeRestricted) return textResult(writeRestricted, true);
		let exists = false;
		let stat: { mtimeMs: number; size: number } | null = null;
		try {
			const s = await fs.stat(abs);
			exists = s.isFile();
			stat = { mtimeMs: s.mtimeMs, size: s.size };
		} catch {
			/* new file */
		}
		const denied = checkFilePolicy(ctx, 'write', [
			{ path: abs, permission: exists ? 'write' : 'create' },
		]);
		if (denied) return textResult(denied, true);
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
			ctx.readState.set(abs, snapshot(after));
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
	needsApproval: (args, ctx) => outsidePathNeedsApproval(ctx, args.path, ['write']),
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly)
			return textResult('edit: disabled by read-only filesystem policy.', true);
		let abs: string;
		try {
			abs = resolveAbs(ctx.workspace, args.path);
		} catch (err) {
			return textResult(`edit: ${(err as Error).message}`, true);
		}
		const editRestricted = checkFsRestriction(ctx, abs, 'edit', true);
		if (editRestricted) return textResult(editRestricted, true);
		const denied = checkFilePolicy(ctx, 'edit', [{ path: abs, permission: 'write' }]);
		if (denied) return textResult(denied, true);
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

interface ApplyPatchArgs {
	diff: string;
}

type PatchOperation = 'create' | 'modify' | 'delete';

interface PatchFile {
	path: string;
	oldPath: string;
	newPath: string;
	operation: PatchOperation;
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
	needsApproval: (args, ctx) => {
		try {
			return parseUnifiedDiff(String(args.diff ?? '')).some((patch) => {
				const permission =
					patch.operation === 'create'
						? 'create'
						: patch.operation === 'delete'
							? 'delete'
							: 'write';
				return outsidePathNeedsApproval(ctx, patch.path, [permission]);
			});
		} catch {
			return false;
		}
	},
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly) {
			return textResult('apply_patch: disabled by read-only filesystem policy.', true);
		}
		try {
			const patches = parseUnifiedDiff(String(args.diff ?? ''));
			if (patches.length === 0) return textResult('apply_patch: no file patches found', true);
			const plans: Array<
				| { operation: 'create' | 'modify'; path: string; abs: string; content: string }
				| { operation: 'delete'; path: string; abs: string }
			> = [];
			const seen = new Set<string>();
			for (const patch of patches) {
				const abs = resolveAbs(ctx.workspace, patch.path);
				const patchRestricted = checkFsRestriction(ctx, abs, 'apply_patch', true);
				if (patchRestricted) return textResult(patchRestricted, true);
				if (seen.has(abs)) return textResult(`apply_patch: duplicate file patch: ${patch.path}`, true);
				seen.add(abs);

				const permission =
					patch.operation === 'create'
						? 'create'
						: patch.operation === 'delete'
							? 'delete'
							: 'write';
				const denied = checkFilePolicy(ctx, 'apply_patch', [{ path: abs, permission }]);
				if (denied) return textResult(denied, true);

				if (patch.operation === 'create') {
					const existing = await fs.stat(abs).catch(() => null);
					if (existing) return textResult(`apply_patch: file already exists: ${patch.path}`, true);
					plans.push({
						operation: 'create',
						path: patch.path,
						abs,
						content: buildCreatedFile(patch),
					});
					continue;
				}

				const stat = await fs.stat(abs);
				if (!stat.isFile()) return textResult(`apply_patch: ${patch.path} is not a file`, true);
				const last = ctx.readState.get(abs);
				if (!last) return textResult(`apply_patch: must read ${patch.path} before patching.`, true);
				if (stat.mtimeMs !== last.mtimeMs || stat.size !== last.size) {
					return textResult(`apply_patch: ${patch.path} changed on disk since last read.`, true);
				}
				const original = await fs.readFile(abs, 'utf8');
				const next = applyFilePatch(original, patch);
				if (patch.operation === 'delete') {
					if (next.length > 0)
						return textResult(`apply_patch: delete patch did not remove all content: ${patch.path}`, true);
					plans.push({ operation: 'delete', path: patch.path, abs });
				} else {
					plans.push({ operation: 'modify', path: patch.path, abs, content: next });
				}
			}
			const changed: string[] = [];
			for (const plan of plans) {
				if (plan.operation === 'delete') {
					await fs.rm(plan.abs);
					ctx.readState.delete(plan.abs);
				} else {
					await fs.mkdir(path.dirname(plan.abs), { recursive: true });
					await fs.writeFile(plan.abs, plan.content, 'utf8');
					const after = await fs.stat(plan.abs);
					ctx.readState.set(plan.abs, snapshot(after));
				}
				changed.push(plan.path);
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
	let oldPath: string | null = null;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? '';
		if (line.startsWith('--- ')) {
			oldPath = parseDiffPath(line.slice(4));
			current = null;
			continue;
		}
		if (line.startsWith('+++ ')) {
			if (!oldPath) throw new Error(`missing old file header before: ${line}`);
			const newPath = parseDiffPath(line.slice(4));
			const operation = patchOperation(oldPath, newPath);
			current = {
				path: operation === 'delete' ? oldPath : newPath,
				oldPath,
				newPath,
				operation,
				hunks: [],
			};
			files.push(current);
			oldPath = null;
			continue;
		}
		if (!current || !line.startsWith('@@ ')) continue;
		const match = /^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/.exec(line);
		if (!match) throw new Error(`invalid hunk header: ${line}`);
		const hunkLines: string[] = [];
		for (i++; i < lines.length; i++) {
			const hunkLine = lines[i] ?? '';
			if (
				hunkLine.startsWith('@@ ') ||
				hunkLine.startsWith('--- ') ||
				hunkLine.startsWith('+++ ')
			) {
				i--;
				break;
			}
			if (hunkLine === '\\ No newline at end of file') continue;
			if (![' ', '+', '-'].includes(hunkLine[0] ?? ''))
				throw new Error(`invalid patch line: ${hunkLine}`);
			hunkLines.push(hunkLine);
		}
		current.hunks.push({ oldStart: Number(match[1]), lines: hunkLines });
	}
	return files;
}

function parseDiffPath(value: string): string {
	const raw = value.trim().split(/\s+/)[0] ?? '';
	if (raw === '/dev/null') return raw;
	return raw.replace(/^[ab]\//, '');
}

function patchOperation(oldPath: string, newPath: string): PatchOperation {
	if (oldPath === '/dev/null' && newPath === '/dev/null') {
		throw new Error('invalid patch with both paths set to /dev/null');
	}
	if (oldPath === '/dev/null') return 'create';
	if (newPath === '/dev/null') return 'delete';
	if (oldPath !== newPath) throw new Error('renaming files via apply_patch is not supported');
	return 'modify';
}

function buildCreatedFile(patch: PatchFile): string {
	const out: string[] = [];
	for (const hunk of patch.hunks) {
		for (const line of hunk.lines) {
			if (line[0] !== '+') {
				throw new Error(`creation patch contains non-addition lines: ${patch.path}`);
			}
			out.push(line.slice(1));
		}
	}
	return out.length > 0 ? `${out.join('\n')}\n` : '';
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
	return out.join('\n') + (hasTrailingNewline && out.length > 0 ? '\n' : '');
}

interface DeleteArgs {
	path: string;
	recursive?: boolean;
}

export const deleteTool: AgentTool<DeleteArgs> = {
	name: 'delete',
	description:
		'Delete a file. Files must be read earlier in this run before deletion. Directories require recursive=true and cannot target root paths.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string' },
			recursive: { type: 'boolean', description: 'Required to delete a directory tree.' },
		},
		required: ['path'],
		additionalProperties: false,
	},
	needsApproval: (args, ctx) => outsidePathNeedsApproval(ctx, args.path, ['delete']),
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly)
			return textResult('delete: disabled by read-only filesystem policy.', true);
		let abs: string;
		try {
			abs = resolveAbs(ctx.workspace, args.path);
		} catch (err) {
			return textResult(`delete: ${(err as Error).message}`, true);
		}
		const deleteRestricted = checkFsRestriction(ctx, abs, 'delete', true);
		if (deleteRestricted) return textResult(deleteRestricted, true);
		const denied = checkFilePolicy(ctx, 'delete', [{ path: abs, permission: 'delete' }]);
		if (denied) return textResult(denied, true);
		const guard = guardedRootMessage(ctx.workspace, abs);
		if (guard) return textResult(`delete: ${guard}.`, true);
		try {
			const stat = await fs.stat(abs);
			if (stat.isDirectory()) {
				if (!args.recursive)
					return textResult('delete: recursive=true is required for directories.', true);
				await fs.rm(abs, { recursive: true });
				return textResult(`deleted directory ${abs}`);
			}
			if (!stat.isFile()) return textResult(`delete: unsupported file type: ${args.path}`, true);
			const blocked = requireReadSnapshot(ctx, abs, stat, args.path, 'delete');
			if (blocked) return textResult(blocked, true);
			await fs.rm(abs);
			ctx.readState.delete(abs);
			return textResult(`deleted ${abs}`);
		} catch (err) {
			return textResult(`delete: ${(err as Error).message}`, true);
		}
	},
};

interface CopyArgs {
	source: string;
	destination: string;
	overwrite?: boolean;
}

export const copyTool: AgentTool<CopyArgs> = {
	name: 'copy',
	description:
		'Copy one file or directory to another path. Creates parent dirs. Set overwrite=true only after reading the destination file.',
	schema: {
		type: 'object',
		properties: {
			source: { type: 'string' },
			destination: { type: 'string' },
			overwrite: { type: 'boolean' },
		},
		required: ['source', 'destination'],
		additionalProperties: false,
	},
	needsApproval: (args, ctx) =>
		outsidePathNeedsApproval(ctx, args.destination, ['write', 'create'], 'any'),
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly)
			return textResult('copy: disabled by read-only filesystem policy.', true);
		let sourceAbs: string;
		let destinationAbs: string;
		try {
			sourceAbs = resolveAbs(ctx.workspace, args.source, readWorkspaceOnly(ctx));
			destinationAbs = resolveAbs(ctx.workspace, args.destination, writeWorkspaceOnly(ctx));
		} catch (err) {
			return textResult(`copy: ${(err as Error).message}`, true);
		}
		if (sourceAbs === destinationAbs)
			return textResult('copy: source and destination are identical.', true);
		try {
			const sourceStat = await fs.stat(sourceAbs);
			const destinationStat = await fs.stat(destinationAbs).catch(() => null);
			if (sourceStat.isDirectory()) {
				const policyChecks = await collectDirectoryCopyPolicyChecks(sourceAbs, destinationAbs);
				const denied = checkFilePolicy(ctx, 'copy', policyChecks);
				if (denied) return textResult(denied, true);
				if (destinationStat)
					return textResult(`copy: destination exists: ${args.destination}`, true);
				await fs.cp(sourceAbs, destinationAbs, {
					recursive: true,
					errorOnExist: true,
					force: false,
				});
				return textResult(`copied directory ${sourceAbs} to ${destinationAbs}`);
			}
			if (!sourceStat.isFile()) return textResult(`copy: unsupported source type: ${args.source}`, true);
			const policyChecks: FilePolicyCheck[] = [
				{ path: sourceAbs, permission: 'read' },
				{ path: destinationAbs, permission: destinationStat ? 'write' : 'create' },
			];
			const denied = checkFilePolicy(ctx, 'copy', policyChecks);
			if (denied) return textResult(denied, true);
			if (destinationStat) {
				if (!args.overwrite)
					return textResult(`copy: destination exists: ${args.destination}`, true);
				if (!destinationStat.isFile())
					return textResult(`copy: destination is not a file: ${args.destination}`, true);
				const blocked = requireReadSnapshot(
					ctx,
					destinationAbs,
					destinationStat,
					args.destination,
					'copy'
				);
				if (blocked) return textResult(blocked, true);
			}
			await fs.mkdir(path.dirname(destinationAbs), { recursive: true });
			await fs.copyFile(sourceAbs, destinationAbs, args.overwrite ? 0 : fsConstants.COPYFILE_EXCL);
			const after = await fs.stat(destinationAbs);
			ctx.readState.set(destinationAbs, snapshot(after));
			return textResult(`copied ${sourceAbs} to ${destinationAbs} (${after.size} bytes)`);
		} catch (err) {
			return textResult(`copy: ${(err as Error).message}`, true);
		}
	},
};

interface MoveArgs {
	source: string;
	destination: string;
	overwrite?: boolean;
}

export const moveTool: AgentTool<MoveArgs> = {
	name: 'move',
	description:
		'Move or rename one file. The source must be read earlier in this run. Set overwrite=true only after reading the destination file.',
	schema: {
		type: 'object',
		properties: {
			source: { type: 'string' },
			destination: { type: 'string' },
			overwrite: { type: 'boolean' },
		},
		required: ['source', 'destination'],
		additionalProperties: false,
	},
	needsApproval: (args, ctx) =>
		outsidePathNeedsApproval(ctx, args.source, ['read', 'delete']) ||
		outsidePathNeedsApproval(ctx, args.destination, ['write', 'create'], 'any'),
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly)
			return textResult('move: disabled by read-only filesystem policy.', true);
		let sourceAbs: string;
		let destinationAbs: string;
		try {
			sourceAbs = resolveAbs(ctx.workspace, args.source, writeWorkspaceOnly(ctx));
			destinationAbs = resolveAbs(ctx.workspace, args.destination, writeWorkspaceOnly(ctx));
		} catch (err) {
			return textResult(`move: ${(err as Error).message}`, true);
		}
		if (sourceAbs === destinationAbs)
			return textResult('move: source and destination are identical.', true);
		try {
			const sourceStat = await fs.stat(sourceAbs);
			if (!sourceStat.isFile())
				return textResult(`move: source is not a file: ${args.source}`, true);
			const sourceBlocked = requireReadSnapshot(ctx, sourceAbs, sourceStat, args.source, 'move');
			if (sourceBlocked) return textResult(sourceBlocked, true);
			const destinationStat = await fs.stat(destinationAbs).catch(() => null);
			const policyChecks: FilePolicyCheck[] = [
				{ path: sourceAbs, permission: 'read' },
				{ path: sourceAbs, permission: 'delete' },
				{ path: destinationAbs, permission: destinationStat ? 'write' : 'create' },
			];
			const denied = checkFilePolicy(ctx, 'move', policyChecks);
			if (denied) return textResult(denied, true);
			if (destinationStat) {
				if (!args.overwrite)
					return textResult(`move: destination exists: ${args.destination}`, true);
				if (!destinationStat.isFile())
					return textResult(`move: destination is not a file: ${args.destination}`, true);
				const destinationBlocked = requireReadSnapshot(
					ctx,
					destinationAbs,
					destinationStat,
					args.destination,
					'move'
				);
				if (destinationBlocked) return textResult(destinationBlocked, true);
				await fs.rm(destinationAbs);
			}
			await fs.mkdir(path.dirname(destinationAbs), { recursive: true });
			try {
				await fs.rename(sourceAbs, destinationAbs);
			} catch (err) {
				if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
				await fs.copyFile(sourceAbs, destinationAbs, fsConstants.COPYFILE_EXCL);
				await fs.rm(sourceAbs);
			}
			const after = await fs.stat(destinationAbs);
			ctx.readState.delete(sourceAbs);
			ctx.readState.set(destinationAbs, snapshot(after));
			return textResult(`moved ${sourceAbs} to ${destinationAbs} (${after.size} bytes)`);
		} catch (err) {
			return textResult(`move: ${(err as Error).message}`, true);
		}
	},
};

interface InspectFileArgs {
	path: string;
	maxBytes?: number;
	includeImage?: boolean;
}

const DEFAULT_INSPECT_BYTES = TOOL_LIMITS.inspectFile.defaultBytes;
const MAX_INSPECT_BYTES = TOOL_LIMITS.inspectFile.maxBytes;
const PREVIEW_BYTES = TOOL_LIMITS.inspectFile.previewBytes;
const DIRECT_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

export const inspectFileTool: AgentTool<InspectFileArgs> = {
	name: 'inspect_file',
	description:
		'Inspect any file as bytes. Returns size, type, hash when practical, hex/text previews, and direct image content for PNG/JPEG/GIF/WebP files.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string' },
			maxBytes: {
				type: 'number',
				description:
					'Maximum bytes to load for previews or direct image content. Default 8388608, max 16777216.',
			},
			includeImage: {
				type: 'boolean',
				description: 'Include direct image content for supported image files. Defaults true.',
			},
		},
		required: ['path'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		let abs: string;
		try {
			abs = resolveAbs(ctx.workspace, args.path, readWorkspaceOnly(ctx));
		} catch (err) {
			return textResult(`inspect_file: ${(err as Error).message}`, true);
		}
		const denied = checkFilePolicy(ctx, 'inspect_file', [{ path: abs, permission: 'read' }]);
		if (denied) return textResult(denied, true);
		try {
			const stat = await fs.stat(abs);
			if (!stat.isFile()) return textResult(`inspect_file: ${args.path} is not a file`, true);
			const maxBytes = Math.floor(
				Math.max(1, Math.min(args.maxBytes ?? DEFAULT_INSPECT_BYTES, MAX_INSPECT_BYTES))
			);
			const { buffer, truncated } = await readFileSample(abs, stat.size, maxBytes);
			const detected = detectFileType(buffer, abs);
			const hash = truncated ? undefined : createHash('sha256').update(buffer).digest('hex');
			const textPreview = looksLikeText(buffer)
				? buffer.subarray(0, PREVIEW_BYTES).toString('utf8')
				: undefined;
			const hexPreview = buffer
				.subarray(0, PREVIEW_BYTES)
				.toString('hex')
				.replace(/(.{2})/g, '$1 ')
				.trim();
			const lines = [
				`# ${abs}`,
				`size: ${stat.size} bytes`,
				`loaded: ${buffer.length} bytes${truncated ? ' (truncated)' : ''}`,
				`mimeType: ${detected.mimeType}`,
			];
			if (detected.width && detected.height)
				lines.push(`dimensions: ${detected.width}x${detected.height}`);
			if (hash) lines.push(`sha256: ${hash}`);
			lines.push(`firstBytesHex: ${hexPreview || '(empty file)'}`);
			if (textPreview) lines.push(`textPreview:\n${textPreview}`);
			const includeImage =
				args.includeImage !== false && !truncated && DIRECT_IMAGE_MIME_TYPES.has(detected.mimeType);
			if (DIRECT_IMAGE_MIME_TYPES.has(detected.mimeType) && !includeImage && truncated) {
				lines.push(`imageContent: omitted because file exceeds maxBytes (${maxBytes})`);
			}
			const content: AgentToolResult['content'] = [{ type: 'text', text: lines.join('\n') }];
			if (includeImage) {
				content.push({
					type: 'image' as const,
					mimeType: detected.mimeType,
					base64: buffer.toString('base64'),
				});
			}
			ctx.readState.set(abs, snapshot(stat));
			return {
				status: 'ok',
				content,
				details: {
					path: args.path,
					absolutePath: abs,
					size: stat.size,
					loadedBytes: buffer.length,
					truncated,
					mimeType: detected.mimeType,
					width: detected.width,
					height: detected.height,
					sha256: hash,
					includedImage: includeImage,
				},
			};
		} catch (err) {
			return textResult(`inspect_file: ${(err as Error).message}`, true);
		}
	},
};

async function readFileSample(
	abs: string,
	size: number,
	maxBytes: number
): Promise<{ buffer: Buffer; truncated: boolean }> {
	if (size <= maxBytes) return { buffer: await fs.readFile(abs), truncated: false };
	const handle = await fs.open(abs, 'r');
	try {
		const buffer = Buffer.alloc(maxBytes);
		const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
		return { buffer: buffer.subarray(0, bytesRead), truncated: true };
	} finally {
		await handle.close();
	}
}

function looksLikeText(buffer: Buffer): boolean {
	if (buffer.length === 0) return true;
	if (buffer.includes(0)) return false;
	const text = buffer.toString('utf8');
	const replacements = text.match(/\uFFFD/g)?.length ?? 0;
	return replacements <= Math.max(1, text.length * 0.01);
}

function detectFileType(
	buffer: Buffer,
	filePath: string
): { mimeType: string; width?: number; height?: number } {
	if (
		buffer.length >= 24 &&
		buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
	) {
		return {
			mimeType: 'image/png',
			width: buffer.readUInt32BE(16),
			height: buffer.readUInt32BE(20),
		};
	}
	if (
		buffer.length >= 10 &&
		buffer
			.subarray(0, 6)
			.toString('ascii')
			.match(/^GIF8[79]a$/)
	) {
		return { mimeType: 'image/gif', width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
	}
	if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
		return { mimeType: 'image/jpeg', ...jpegDimensions(buffer) };
	}
	if (
		buffer.length >= 16 &&
		buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
		buffer.subarray(8, 12).toString('ascii') === 'WEBP'
	) {
		return { mimeType: 'image/webp', ...webpDimensions(buffer) };
	}
	if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return { mimeType: 'application/pdf' };
	if (buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])))
		return { mimeType: 'application/zip' };
	return {
		mimeType:
			mimeFromExtension(filePath) ??
			(looksLikeText(buffer) ? 'text/plain' : 'application/octet-stream'),
	};
}

function jpegDimensions(buffer: Buffer): { width?: number; height?: number } {
	let offset = 2;
	while (offset + 9 < buffer.length) {
		if (buffer[offset] !== 0xff) {
			offset++;
			continue;
		}
		const marker = buffer[offset + 1];
		offset += 2;
		if (marker === 0xd9 || marker === 0xda) break;
		if (offset + 2 > buffer.length) break;
		const length = buffer.readUInt16BE(offset);
		if (length < 2 || offset + length > buffer.length) break;
		if (
			(marker >= 0xc0 && marker <= 0xc3) ||
			(marker >= 0xc5 && marker <= 0xc7) ||
			(marker >= 0xc9 && marker <= 0xcb) ||
			(marker >= 0xcd && marker <= 0xcf)
		) {
			return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
		}
		offset += length;
	}
	return {};
}

function webpDimensions(buffer: Buffer): { width?: number; height?: number } {
	const chunk = buffer.subarray(12, 16).toString('ascii');
	if (chunk === 'VP8X' && buffer.length >= 30) {
		return {
			width: buffer.readUIntLE(24, 3) + 1,
			height: buffer.readUIntLE(27, 3) + 1,
		};
	}
	return {};
}

function mimeFromExtension(filePath: string): string | undefined {
	switch (path.extname(filePath).toLowerCase()) {
		case '.txt':
		case '.md':
		case '.ts':
		case '.tsx':
		case '.js':
		case '.jsx':
		case '.json':
		case '.css':
		case '.html':
		case '.xml':
		case '.svg':
			return 'text/plain';
		case '.pdf':
			return 'application/pdf';
		default:
			return undefined;
	}
}

interface FindArgs {
	pattern: string;
	path?: string;
	limit?: number;
}

const DEFAULT_FIND_LIMIT = TOOL_LIMITS.find.defaultLimit;
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
		const limit =
			typeof args.limit === 'number' && args.limit > 0
				? Math.min(Math.floor(args.limit), TOOL_LIMITS.find.maxLimit)
				: DEFAULT_FIND_LIMIT;
		try {
			const dir = args.path
				? resolveAbs(ctx.workspace, args.path, readWorkspaceOnly(ctx))
				: ctx.workspace;
			const denied = checkFilePolicy(ctx, 'find', [{ path: dir, permission: 'read' }]);
			if (denied) return textResult(denied, true);
			const stat = await fs.stat(dir).catch(() => null);
			if (!stat || !stat.isDirectory()) return textResult(`find: not a directory: ${dir}`, true);
			const results: string[] = [];
			const iter = fs.glob(pattern, { cwd: dir, exclude: FIND_EXCLUDES, withFileTypes: true });
			for await (const dirent of iter) {
				const full = path.join(dirent.parentPath, dirent.name);
				if (checkFilePolicy(ctx, 'find', [{ path: full, permission: 'read' }])) continue;
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
