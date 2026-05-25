import { createHash } from 'node:crypto';
import { constants as fsConstants, promises as fs } from 'node:fs';
import type { Stats } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AgentTool, AgentToolResult, ToolContext } from '../core/types';
import { textResult } from '../core/types';
import { TOOL_LIMITS } from '../core/limits';

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
	const resolved = path.isAbsolute(expanded)
		? path.resolve(expanded)
		: path.resolve(workspace, expanded);
	if (workspaceOnly && !isInsidePath(workspace, resolved)) {
		throw new Error('Path is outside the workspace.');
	}
	return resolved;
}

function readWorkspaceOnly(ctx: ToolContext): boolean {
	return ctx.fsPolicy?.workspaceOnly === true;
}

function writeWorkspaceOnly(ctx: ToolContext, defaultWhenUnset = true): boolean {
	if (ctx.fsPolicy?.workspaceOnly === true) return true;
	if (ctx.fsPolicy?.writeWorkspaceOnly !== undefined) return ctx.fsPolicy.writeWorkspaceOnly;
	return defaultWhenUnset;
}

function writePathNeedsApproval(ctx: ToolContext, target: string): boolean {
	const abs = resolveAbs(ctx.workspace, target, false);
	return !isInsidePath(ctx.workspace, abs);
}

function anyWritePathNeedsApproval(ctx: ToolContext, targets: string[]): boolean {
	return targets.some((target) => writePathNeedsApproval(ctx, target));
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
			const abs = resolveAbs(ctx.workspace, args.path, readWorkspaceOnly(ctx));
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
	needsApproval: (args, ctx) => writePathNeedsApproval(ctx, args.path),
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly) {
			return textResult('write: disabled by read-only filesystem policy.', true);
		}
		let abs: string;
		try {
			abs = resolveAbs(ctx.workspace, args.path, writeWorkspaceOnly(ctx));
		} catch (err) {
			return textResult(`write: ${(err as Error).message}`, true);
		}
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
	needsApproval: (args, ctx) => writePathNeedsApproval(ctx, args.path),
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly)
			return textResult('edit: disabled by read-only filesystem policy.', true);
		let abs: string;
		try {
			abs = resolveAbs(ctx.workspace, args.path, writeWorkspaceOnly(ctx));
		} catch (err) {
			return textResult(`edit: ${(err as Error).message}`, true);
		}
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
	needsApproval: (args, ctx) => {
		try {
			return anyWritePathNeedsApproval(
				ctx,
				parseUnifiedDiff(String(args.diff ?? '')).map((patch) => patch.path)
			);
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
			const changed: string[] = [];
			for (const patch of patches) {
				const abs = resolveAbs(ctx.workspace, patch.path, writeWorkspaceOnly(ctx, true));
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
				ctx.readState.set(abs, snapshot(after));
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
			if (normalized === '/dev/null')
				throw new Error('creating files via apply_patch is not supported');
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
	needsApproval: (args, ctx) => writePathNeedsApproval(ctx, args.path),
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly)
			return textResult('delete: disabled by read-only filesystem policy.', true);
		let abs: string;
		try {
			abs = resolveAbs(ctx.workspace, args.path, writeWorkspaceOnly(ctx));
		} catch (err) {
			return textResult(`delete: ${(err as Error).message}`, true);
		}
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
		'Copy one file to another path. Creates parent dirs. Set overwrite=true only after reading the destination file.',
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
	needsApproval: (args, ctx) => writePathNeedsApproval(ctx, args.destination),
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
			if (!sourceStat.isFile())
				return textResult(`copy: source is not a file: ${args.source}`, true);
			const destinationStat = await fs.stat(destinationAbs).catch(() => null);
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
	needsApproval: (args, ctx) => anyWritePathNeedsApproval(ctx, [args.source, args.destination]),
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
