import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentTool, AgentToolResult, ToolContext } from './types';
import { jsonResult, textResult } from './types';

type DirectoryEntry = {
	name: string;
	path: string;
	type: 'file' | 'directory' | 'symlink' | 'other';
	size: number;
	mtimeMs: number;
};

const DEFAULT_MAX_RESULTS = 200;

function workspaceRoot(ctx: ToolContext): string {
	return path.resolve(ctx.workspace);
}

function stringArg(value: unknown, name: string): string {
	if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required.`);
	return value;
}

function optionalStringArg(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value : undefined;
}

function textArg(value: unknown, name: string): string {
	if (typeof value !== 'string') throw new Error(`${name} is required.`);
	return value;
}

function numberArg(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function booleanArg(value: unknown): boolean {
	return value === true;
}

function resolveWorkspacePath(ctx: ToolContext, target: unknown = '.'): string {
	const root = workspaceRoot(ctx);
	const input = typeof target === 'string' && target.trim() ? target : '.';
	const resolved = path.resolve(root, input);
	const relative = path.relative(root, resolved);
	if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('path is outside workspace.');
	return resolved;
}

function relativeToWorkspace(ctx: ToolContext, target: string): string {
	const relative = path.relative(workspaceRoot(ctx), target);
	return relative || '.';
}

function entryType(stat: Awaited<ReturnType<typeof fs.lstat>>): DirectoryEntry['type'] {
	if (stat.isFile()) return 'file';
	if (stat.isDirectory()) return 'directory';
	if (stat.isSymbolicLink()) return 'symlink';
	return 'other';
}

async function statEntry(ctx: ToolContext, target: string): Promise<DirectoryEntry> {
	const stat = await fs.lstat(target);
	return {
		name: path.basename(target),
		path: relativeToWorkspace(ctx, target),
		type: entryType(stat),
		size: stat.size,
		mtimeMs: stat.mtimeMs,
	};
}

async function walk(ctx: ToolContext, start: string, maxResults: number): Promise<DirectoryEntry[]> {
	const results: DirectoryEntry[] = [];
	const visit = async (current: string): Promise<void> => {
		if (results.length >= maxResults) return;
		const stat = await fs.lstat(current);
		if (!stat.isDirectory()) {
			results.push(await statEntry(ctx, current));
			return;
		}
		const entries = await fs.readdir(current);
		for (const entry of entries) {
			if (results.length >= maxResults) return;
			const fullPath = path.join(current, entry);
			results.push(await statEntry(ctx, fullPath));
			if ((await fs.lstat(fullPath)).isDirectory()) await visit(fullPath);
		}
	};
	await visit(start);
	return results;
}

function wildcardToRegExp(pattern: string): RegExp {
	const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
	return new RegExp(`^${escaped}$`, 'i');
}

function ensureWritable(ctx: ToolContext): AgentToolResult | undefined {
	if (ctx.fsPolicy?.readOnly) return textResult('Filesystem is read-only for this run.', true);
	return undefined;
}

async function ensureParent(file: string): Promise<void> {
	await fs.mkdir(path.dirname(file), { recursive: true });
}

async function pathExists(target: string): Promise<boolean> {
	return fs.access(target).then(() => true, () => false);
}

async function readTextFile(ctx: ToolContext, target: string): Promise<string> {
	const stat = await fs.stat(target);
	if (!stat.isFile()) throw new Error('path is not a file.');
	ctx.readState.set(target, { mtimeMs: stat.mtimeMs, size: stat.size });
	return fs.readFile(target, 'utf8');
}

function extractPatchPaths(patch: string): string[] {
	const paths = new Set<string>();
	for (const line of patch.split(/\r?\n/)) {
		const match = /^(?:---|\+\+\+)\s+(.+)$/.exec(line);
		if (!match) continue;
		const file = match[1]!.trim().split(/\s+/)[0]!;
		if (file === '/dev/null') continue;
		paths.add(file.replace(/^[ab]\//, ''));
	}
	return [...paths];
}

function runGitApply(root: string, patch: string, signal?: AbortSignal): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn('git', ['apply', '--whitespace=nowarn', '-'], { cwd: root, signal });
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (chunk) => { stdout += String(chunk); });
		child.stderr.on('data', (chunk) => { stderr += String(chunk); });
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) resolve(stdout.trim() || 'patch applied');
			else reject(new Error(stderr.trim() || `git apply exited with code ${code ?? 'unknown'}`));
		});
		child.stdin.end(patch);
	});
}

export const listDirTool: AgentTool = {
	name: 'list_dir',
	description: 'List files and directories under a workspace path.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string' },
			recursive: { type: 'boolean' },
			maxResults: { type: 'number' },
		},
	},
	async execute(args, ctx) {
		const dir = resolveWorkspacePath(ctx, args.path);
		const maxResults = numberArg(args.maxResults, DEFAULT_MAX_RESULTS);
		const entries = booleanArg(args.recursive)
			? await walk(ctx, dir, maxResults)
			: await Promise.all((await fs.readdir(dir)).slice(0, maxResults).map((entry) => statEntry(ctx, path.join(dir, entry))));
		return jsonResult(entries);
	},
};

export const readFileTool: AgentTool = {
	name: 'read_file',
	description: 'Read a UTF-8 workspace file.',
	schema: {
		type: 'object',
		required: ['path'],
		properties: {
			path: { type: 'string' },
			offset: { type: 'number' },
			limit: { type: 'number' },
		},
	},
	async execute(args, ctx) {
		const file = resolveWorkspacePath(ctx, args.path);
		const content = await readTextFile(ctx, file);
		const lines = content.split(/\r?\n/);
		const offset = numberArg(args.offset, 0);
		const limit = typeof args.limit === 'number' ? numberArg(args.limit, lines.length) : lines.length;
		return textResult(lines.slice(offset, offset + limit).join('\n'));
	},
};

export const statPathTool: AgentTool = {
	name: 'stat_path',
	description: 'Return metadata for a workspace path.',
	schema: { type: 'object', required: ['path'], properties: { path: { type: 'string' } } },
	async execute(args, ctx) {
		return jsonResult(await statEntry(ctx, resolveWorkspacePath(ctx, args.path)));
	},
};

export const searchFilesTool: AgentTool = {
	name: 'search_files',
	description: 'Find workspace paths by name, substring, or wildcard pattern.',
	schema: {
		type: 'object',
		required: ['query'],
		properties: {
			query: { type: 'string' },
			path: { type: 'string' },
			maxResults: { type: 'number' },
		},
	},
	async execute(args, ctx) {
		const query = stringArg(args.query, 'query');
		const root = resolveWorkspacePath(ctx, args.path);
		const maxResults = numberArg(args.maxResults, DEFAULT_MAX_RESULTS);
		const matcher = query.includes('*') || query.includes('?') ? wildcardToRegExp(query) : undefined;
		const entries = await walk(ctx, root, maxResults * 5);
		return jsonResult(entries.filter((entry) => matcher ? matcher.test(entry.name) || matcher.test(entry.path) : entry.path.toLowerCase().includes(query.toLowerCase())).slice(0, maxResults));
	},
};

export const grepFilesTool: AgentTool = {
	name: 'grep_files',
	description: 'Search UTF-8 workspace file contents.',
	schema: {
		type: 'object',
		required: ['query'],
		properties: {
			query: { type: 'string' },
			path: { type: 'string' },
			regex: { type: 'boolean' },
			caseSensitive: { type: 'boolean' },
			maxResults: { type: 'number' },
		},
	},
	async execute(args, ctx) {
		const query = stringArg(args.query, 'query');
		const root = resolveWorkspacePath(ctx, args.path);
		const maxResults = numberArg(args.maxResults, DEFAULT_MAX_RESULTS);
		const flags = booleanArg(args.caseSensitive) ? 'g' : 'gi';
		const pattern = booleanArg(args.regex) ? new RegExp(query, flags) : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
		const files = (await walk(ctx, root, maxResults * 20)).filter((entry) => entry.type === 'file');
		const matches: Array<{ path: string; lineNumber: number; line: string }> = [];
		for (const file of files) {
			if (matches.length >= maxResults) break;
			const absolute = resolveWorkspacePath(ctx, file.path);
			const content = await fs.readFile(absolute, 'utf8').catch(() => '');
			const lines = content.split(/\r?\n/);
			for (let index = 0; index < lines.length && matches.length < maxResults; index++) {
				pattern.lastIndex = 0;
				if (pattern.test(lines[index]!)) matches.push({ path: file.path, lineNumber: index + 1, line: lines[index]! });
			}
		}
		return jsonResult(matches);
	},
};

export const readDiffTool: AgentTool = {
	name: 'read_diff',
	description: 'Read Git diff output for workspace changes.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string' },
			staged: { type: 'boolean' },
		},
	},
	async execute(args, ctx) {
		const root = workspaceRoot(ctx);
		const target = optionalStringArg(args.path);
		const commandArgs = ['diff', ...(booleanArg(args.staged) ? ['--cached'] : []), '--', ...(target ? [relativeToWorkspace(ctx, resolveWorkspacePath(ctx, target))] : [])];
		return new Promise<AgentToolResult>((resolve) => {
			const child = spawn('git', commandArgs, { cwd: root, signal: ctx.signal });
			let stdout = '';
			let stderr = '';
			child.stdout.on('data', (chunk) => { stdout += String(chunk); });
			child.stderr.on('data', (chunk) => { stderr += String(chunk); });
			child.on('error', (error) => resolve(textResult(error.message, true)));
			child.on('close', (code) => resolve(code === 0 ? textResult(stdout) : textResult(stderr.trim() || `git diff exited with code ${code ?? 'unknown'}`, true)));
		});
	},
};

export const getWorkspaceRootTool: AgentTool = {
	name: 'get_workspace_root',
	description: 'Return the absolute workspace root.',
	schema: { type: 'object', properties: {} },
	async execute(_args, ctx) {
		return jsonResult({ root: workspaceRoot(ctx) });
	},
};

export const resolvePathTool: AgentTool = {
	name: 'resolve_path',
	description: 'Resolve a workspace-relative path and report whether it exists.',
	schema: { type: 'object', required: ['path'], properties: { path: { type: 'string' } } },
	async execute(args, ctx) {
		const resolved = resolveWorkspacePath(ctx, args.path);
		return jsonResult({
			input: stringArg(args.path, 'path'),
			root: workspaceRoot(ctx),
			absolute: resolved,
			relative: relativeToWorkspace(ctx, resolved),
			exists: await pathExists(resolved),
		});
	},
};

export const writeFileTool: AgentTool = {
	name: 'write_file',
	description: 'Create or overwrite a UTF-8 workspace file.',
	schema: { type: 'object', required: ['path', 'content'], properties: { path: { type: 'string' }, content: { type: 'string' } } },
	async execute(args, ctx) {
		const blocked = ensureWritable(ctx);
		if (blocked) return blocked;
		const content = textArg(args.content, 'content');
		const file = resolveWorkspacePath(ctx, args.path);
		await ensureParent(file);
		await fs.writeFile(file, content, 'utf8');
		return textResult(`wrote ${relativeToWorkspace(ctx, file)}`);
	},
};

export const appendFileTool: AgentTool = {
	name: 'append_file',
	description: 'Append UTF-8 text to a workspace file.',
	schema: { type: 'object', required: ['path', 'content'], properties: { path: { type: 'string' }, content: { type: 'string' } } },
	async execute(args, ctx) {
		const blocked = ensureWritable(ctx);
		if (blocked) return blocked;
		const content = textArg(args.content, 'content');
		const file = resolveWorkspacePath(ctx, args.path);
		await ensureParent(file);
		await fs.appendFile(file, content, 'utf8');
		return textResult(`appended ${relativeToWorkspace(ctx, file)}`);
	},
};

export const editFileTool: AgentTool = {
	name: 'edit_file',
	description: 'Replace exact text in a UTF-8 workspace file.',
	schema: {
		type: 'object',
		required: ['path', 'oldText', 'newText'],
		properties: {
			path: { type: 'string' },
			oldText: { type: 'string' },
			newText: { type: 'string' },
			replaceAll: { type: 'boolean' },
		},
	},
	async execute(args, ctx) {
		const blocked = ensureWritable(ctx);
		if (blocked) return blocked;
		const file = resolveWorkspacePath(ctx, args.path);
		const oldText = stringArg(args.oldText, 'oldText');
		const newText = typeof args.newText === 'string' ? args.newText : '';
		const content = await readTextFile(ctx, file);
		if (!content.includes(oldText)) throw new Error('oldText was not found.');
		const next = booleanArg(args.replaceAll) ? content.split(oldText).join(newText) : content.replace(oldText, newText);
		await fs.writeFile(file, next, 'utf8');
		return textResult(`edited ${relativeToWorkspace(ctx, file)}`);
	},
};

export const createDirTool: AgentTool = {
	name: 'create_dir',
	description: 'Create a workspace directory.',
	schema: { type: 'object', required: ['path'], properties: { path: { type: 'string' } } },
	async execute(args, ctx) {
		const blocked = ensureWritable(ctx);
		if (blocked) return blocked;
		const dir = resolveWorkspacePath(ctx, args.path);
		await fs.mkdir(dir, { recursive: true });
		return textResult(`created ${relativeToWorkspace(ctx, dir)}`);
	},
};

export const copyPathTool: AgentTool = {
	name: 'copy_path',
	description: 'Copy a file or directory within the workspace.',
	schema: {
		type: 'object',
		required: ['sourcePath', 'destinationPath'],
		properties: { sourcePath: { type: 'string' }, destinationPath: { type: 'string' }, overwrite: { type: 'boolean' } },
	},
	async execute(args, ctx) {
		const blocked = ensureWritable(ctx);
		if (blocked) return blocked;
		const source = resolveWorkspacePath(ctx, args.sourcePath);
		const destination = resolveWorkspacePath(ctx, args.destinationPath);
		await ensureParent(destination);
		await fs.cp(source, destination, { recursive: true, force: booleanArg(args.overwrite), errorOnExist: !booleanArg(args.overwrite) });
		return textResult(`copied ${relativeToWorkspace(ctx, source)} to ${relativeToWorkspace(ctx, destination)}`);
	},
};

export const movePathTool: AgentTool = {
	name: 'move_path',
	description: 'Move or rename a workspace path.',
	schema: {
		type: 'object',
		required: ['sourcePath', 'destinationPath'],
		properties: { sourcePath: { type: 'string' }, destinationPath: { type: 'string' }, overwrite: { type: 'boolean' } },
	},
	async execute(args, ctx) {
		const blocked = ensureWritable(ctx);
		if (blocked) return blocked;
		const source = resolveWorkspacePath(ctx, args.sourcePath);
		const destination = resolveWorkspacePath(ctx, args.destinationPath);
		if (!booleanArg(args.overwrite) && await pathExists(destination)) throw new Error('destination already exists.');
		await ensureParent(destination);
		if (booleanArg(args.overwrite)) await fs.rm(destination, { recursive: true, force: true });
		await fs.rename(source, destination);
		return textResult(`moved ${relativeToWorkspace(ctx, source)} to ${relativeToWorkspace(ctx, destination)}`);
	},
};

export const applyPatchTool: AgentTool = {
	name: 'apply_patch',
	description: 'Apply a unified diff to workspace files.',
	schema: { type: 'object', required: ['patch'], properties: { patch: { type: 'string' } } },
	async execute(args, ctx) {
		const blocked = ensureWritable(ctx);
		if (blocked) return blocked;
		const patch = stringArg(args.patch, 'patch');
		for (const patchPath of extractPatchPaths(patch)) resolveWorkspacePath(ctx, patchPath);
		return textResult(await runGitApply(workspaceRoot(ctx), patch, ctx.signal));
	},
};

export const deletePathTool: AgentTool = {
	name: 'delete_path',
	description: 'Delete a workspace file or directory.',
	schema: { type: 'object', required: ['path'], properties: { path: { type: 'string' }, recursive: { type: 'boolean' } } },
	async execute(args, ctx) {
		const blocked = ensureWritable(ctx);
		if (blocked) return blocked;
		const target = resolveWorkspacePath(ctx, args.path);
		const stat = await fs.lstat(target);
		await fs.rm(target, { recursive: stat.isDirectory() ? booleanArg(args.recursive) : false, force: false });
		return textResult(`deleted ${relativeToWorkspace(ctx, target)}`);
	},
};

export const filesystemReadTools = [
	listDirTool,
	readFileTool,
	statPathTool,
	searchFilesTool,
	grepFilesTool,
	readDiffTool,
	getWorkspaceRootTool,
	resolvePathTool,
] as const;

export const filesystemWriteTools = [
	writeFileTool,
	appendFileTool,
	editFileTool,
	createDirTool,
	copyPathTool,
	movePathTool,
	applyPatchTool,
] as const;

export const filesystemDeleteTools = [
	deletePathTool,
] as const;

export const filesystemTools = [
	...filesystemReadTools,
	...filesystemWriteTools,
	...filesystemDeleteTools,
] as const;

export const readTool = readFileTool;
export const writeTool = writeFileTool;
