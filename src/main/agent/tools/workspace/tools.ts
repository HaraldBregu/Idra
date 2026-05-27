import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Stats } from 'node:fs';
import type { AgentTool, AgentToolResult, ToolContext } from '../core/types';
import { textResult } from '../core/types';
import { TOOL_LIMITS } from '../core/limits';
import { checkFilePolicy } from '../files/policy';
import { checkFsRestriction, resolveAbs } from '../files/path-policy';
import { editTool, findTool, readTool, writeTool, filesystemListTool } from '../files/tools';
import { toolDescription } from '../metadata';

type Snapshot =
	| { kind: 'missing' }
	| { kind: 'file'; content: string; mtimeMs: number; size: number }
	| { kind: 'other' };

type UndoEntry = {
	path: string;
	abs: string;
	before: Snapshot;
};

const undoStacks = new WeakMap<ToolContext, UndoEntry[]>();

export const readFileTool: AgentTool = {
	...readTool,
	name: 'read_file',
	description: toolDescription('read_file'),
};

export const writeFileTool: AgentTool = {
	...writeTool,
	name: 'write_file',
	description: toolDescription('write_file'),
	async execute(args, ctx) {
		const before = await snapshotTarget(ctx, args.path).catch(() => null);
		const result = await writeTool.execute(args, ctx);
		if (result.status === 'ok' && before && before.before.kind !== 'other') {
			pushUndo(ctx, before);
		}
		return result;
	},
};

export const editFileTool: AgentTool = {
	...editTool,
	name: 'edit_file',
	description: toolDescription('edit_file'),
	async execute(args, ctx) {
		const before = await snapshotTarget(ctx, args.path).catch(() => null);
		const result = await editTool.execute(args, ctx);
		if (result.status === 'ok' && before && before.before.kind === 'file') {
			pushUndo(ctx, before);
		}
		return result;
	},
};

export const listDirectoryTool: AgentTool = {
	...filesystemListTool,
	name: 'list_directory',
	description: toolDescription('list_directory'),
};

export const searchFilesTool: AgentTool = {
	...findTool,
	name: 'search_files',
	description: toolDescription('search_files'),
};

export const grepTool: AgentTool<{
	pattern: string;
	path?: string;
	regex?: boolean;
	caseSensitive?: boolean;
	limit?: number;
}> = {
	name: 'grep',
	description: toolDescription('grep'),
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
			const restricted = checkFsRestriction(ctx, root, 'grep', false);
			if (restricted) return textResult(restricted, true);
			const denied = checkFilePolicy(ctx, 'grep', [{ path: root, permission: 'read' }]);
			if (denied) return textResult(denied, true);
			const stat = await fs.stat(root);
			const files = stat.isFile() ? [root] : await collectFiles(root, limit * 20);
			const matches: string[] = [];
			for (const file of files) {
				if (checkFilePolicy(ctx, 'grep', [{ path: file, permission: 'read' }])) continue;
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

export const runShellTool: AgentTool<{
	command: string;
	cwd?: string;
	timeoutMs?: number;
	maxOutputBytes?: number;
}> = {
	name: 'run_shell',
	description: toolDescription('run_shell'),
	schema: {
		type: 'object',
		properties: {
			command: { type: 'string' },
			cwd: { type: 'string', description: 'Working directory; defaults to workspace.' },
			timeoutMs: { type: 'number' },
			maxOutputBytes: { type: 'number' },
		},
		required: ['command'],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly) {
			return textResult('run_shell: disabled by read-only filesystem policy.', true);
		}
		const command = String(args.command ?? '').trim();
		if (!command) return textResult('run_shell: command is required.', true);
		let cwd: string;
		try {
			cwd = args.cwd ? resolveAbs(ctx.workspace, args.cwd) : ctx.workspace;
		} catch (error) {
			return textResult(`run_shell: ${(error as Error).message}`, true);
		}
		const restricted = checkFsRestriction(ctx, cwd, 'run_shell', true);
		if (restricted) return textResult(restricted, true);
		const denied = checkFilePolicy(ctx, 'run_shell', [{ path: cwd, permission: 'write' }]);
		if (denied) return textResult(denied, true);
		return commandResult(
			'run_shell',
			await runProcess({
				command,
				args: [],
				cwd,
				shell: true,
				timeoutMs: limitNumber(args.timeoutMs, 30_000, 120_000),
				maxOutputBytes: limitNumber(args.maxOutputBytes, 32_768, 131_072),
				signal: ctx.signal,
			})
		);
	},
};

export const gitStatusTool: AgentTool<{ path?: string }> = {
	name: 'git_status',
	description: toolDescription('git_status'),
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string', description: 'Git work tree path; defaults to workspace.' },
		},
		required: [],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const cwd = args.path ? resolveAbs(ctx.workspace, args.path) : ctx.workspace;
		const restricted = checkFsRestriction(ctx, cwd, 'git_status', false);
		if (restricted) return textResult(restricted, true);
		return commandResult(
			'git_status',
			await runProcess({
				command: 'git',
				args: ['status', '--short', '--branch'],
				cwd,
				shell: false,
				timeoutMs: 30_000,
				maxOutputBytes: 32_768,
				signal: ctx.signal,
			})
		);
	},
};

export const gitDiffTool: AgentTool<{ path?: string; staged?: boolean; stat?: boolean }> = {
	name: 'git_diff',
	description: toolDescription('git_diff'),
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string', description: 'Optional file or directory path.' },
			staged: { type: 'boolean' },
			stat: { type: 'boolean' },
		},
		required: [],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const target = args.path ? resolveAbs(ctx.workspace, args.path) : ctx.workspace;
		const restricted = checkFsRestriction(ctx, target, 'git_diff', false);
		if (restricted) return textResult(restricted, true);
		const commandArgs = ['diff'];
		if (args.staged) commandArgs.push('--staged');
		if (args.stat) commandArgs.push('--stat');
		if (args.path) commandArgs.push('--', target);
		return commandResult(
			'git_diff',
			await runProcess({
				command: 'git',
				args: commandArgs,
				cwd: ctx.workspace,
				shell: false,
				timeoutMs: 30_000,
				maxOutputBytes: 131_072,
				signal: ctx.signal,
			})
		);
	},
};

export const undoLastOperationTool: AgentTool = {
	name: 'undo_last_operation',
	description: toolDescription('undo_last_operation'),
	schema: {
		type: 'object',
		properties: {},
		required: [],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(_args, ctx) {
		if (ctx.fsPolicy?.readOnly) {
			return textResult('undo_last_operation: disabled by read-only filesystem policy.', true);
		}
		const entry = undoStacks.get(ctx)?.pop();
		if (!entry) return textResult('undo_last_operation: no reversible operation recorded.', true);
		const restricted = checkFsRestriction(ctx, entry.abs, 'undo_last_operation', true);
		if (restricted) return textResult(restricted, true);
		const permission = entry.before.kind === 'missing' ? 'delete' : 'write';
		const denied = checkFilePolicy(ctx, 'undo_last_operation', [{ path: entry.abs, permission }]);
		if (denied) return textResult(denied, true);
		try {
			if (entry.before.kind === 'missing') {
				await fs.rm(entry.abs, { force: true });
				ctx.readState.delete(entry.abs);
			} else if (entry.before.kind === 'file') {
				await fs.writeFile(entry.abs, entry.before.content, 'utf8');
				ctx.readState.set(entry.abs, {
					mtimeMs: entry.before.mtimeMs,
					size: entry.before.size,
				});
			}
			return textResult(`undid last operation on ${entry.path}`);
		} catch (error) {
			return textResult(`undo_last_operation: ${(error as Error).message}`, true);
		}
	},
};

async function snapshotTarget(
	ctx: ToolContext,
	target: unknown
): Promise<UndoEntry> {
	if (typeof target !== 'string') return { path: String(target), abs: '', before: { kind: 'other' } };
	const abs = resolveAbs(ctx.workspace, target);
	const stat = await fs.stat(abs).catch((error: NodeJS.ErrnoException) => {
		if (error.code === 'ENOENT') return null;
		throw error;
	});
	if (!stat) return { path: target, abs, before: { kind: 'missing' } };
	if (!stat.isFile()) return { path: target, abs, before: { kind: 'other' } };
	return {
		path: target,
		abs,
		before: {
			kind: 'file',
			content: await fs.readFile(abs, 'utf8'),
			mtimeMs: stat.mtimeMs,
			size: stat.size,
		},
	};
}

function pushUndo(ctx: ToolContext, entry: UndoEntry): void {
	const stack = undoStacks.get(ctx) ?? [];
	stack.push(entry);
	undoStacks.set(ctx, stack.slice(-20));
}

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

type ProcessOutput = {
	exitCode: number | null;
	signal: NodeJS.Signals | null;
	stdout: string;
	stderr: string;
	timedOut: boolean;
	durationMs: number;
};

function runProcess(input: {
	command: string;
	args: string[];
	cwd: string;
	shell: boolean;
	timeoutMs: number;
	maxOutputBytes: number;
	signal?: AbortSignal;
}): Promise<ProcessOutput> {
	return new Promise((resolve) => {
		const startedAt = Date.now();
		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];
		let stdoutBytes = 0;
		let stderrBytes = 0;
		let timedOut = false;
		const child = spawn(input.command, input.args, {
			cwd: input.cwd,
			env: process.env,
			shell: input.shell,
		});
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill('SIGTERM');
		}, input.timeoutMs);
		const abort = () => child.kill('SIGTERM');
		input.signal?.addEventListener('abort', abort, { once: true });
		child.stdout?.on('data', (chunk: Buffer) => {
			if (stdoutBytes >= input.maxOutputBytes) return;
			const next = chunk.subarray(0, input.maxOutputBytes - stdoutBytes);
			stdout.push(next);
			stdoutBytes += next.length;
		});
		child.stderr?.on('data', (chunk: Buffer) => {
			if (stderrBytes >= input.maxOutputBytes) return;
			const next = chunk.subarray(0, input.maxOutputBytes - stderrBytes);
			stderr.push(next);
			stderrBytes += next.length;
		});
		child.on('close', (exitCode, signal) => {
			clearTimeout(timer);
			input.signal?.removeEventListener('abort', abort);
			resolve({
				exitCode,
				signal,
				stdout: Buffer.concat(stdout).toString('utf8').trimEnd(),
				stderr: Buffer.concat(stderr).toString('utf8').trimEnd(),
				timedOut,
				durationMs: Date.now() - startedAt,
			});
		});
		child.on('error', (error) => {
			clearTimeout(timer);
			input.signal?.removeEventListener('abort', abort);
			resolve({
				exitCode: null,
				signal: null,
				stdout: '',
				stderr: error.message,
				timedOut,
				durationMs: Date.now() - startedAt,
			});
		});
	});
}

function commandResult(toolName: string, output: ProcessOutput): AgentToolResult {
	const status = !output.timedOut && output.exitCode === 0 ? 'ok' : 'error';
	const lines = [
		`exitCode: ${output.exitCode ?? 'null'}`,
		`signal: ${output.signal ?? 'none'}`,
		`durationMs: ${output.durationMs}`,
		'stdout:',
		output.stdout || '(empty)',
		'stderr:',
		output.stderr || '(empty)',
	];
	if (output.timedOut) lines.push('timed out');
	return {
		status,
		content: [{ type: 'text', text: lines.join('\n') }],
		details: { status, toolName, ...output },
	};
}

function limitNumber(value: unknown, fallback: number, max: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
	return Math.max(1, Math.min(Math.floor(value), max));
}
