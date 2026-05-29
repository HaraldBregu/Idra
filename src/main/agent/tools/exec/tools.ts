import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable } from 'node:stream';
import path from 'node:path';
import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { TOOL_LIMITS } from '../core/limits';

const DENY_PATTERNS: RegExp[] = [
	/\brm\s+-rf\s+\/(?:\s|$)/,
	/\brm\s+-rf\s+\/\*/,
	/\bgit\s+push\s+.*--force.*\b(main|master)\b/,
	/\b:(){:|:&};:/,
	/\bmkfs\b/,
	/\bdd\s+if=.*of=\/dev\//,
	/\bshutdown\b/,
	/\breboot\b/,
];

const MAX_OUTPUT_BYTES = TOOL_LIMITS.exec.maxOutputBytes;
const MAX_OUTPUT_LINES = TOOL_LIMITS.exec.maxOutputLines;
const DEFAULT_TIMEOUT_MS = TOOL_LIMITS.exec.timeoutMs;

interface ExecArgs {
	command: string;
	workdir?: string;
	timeoutMs?: number;
	env?: Record<string, string>;
	background?: boolean;
}

interface ExecDetails {
	exitCode: number | null;
	durationMs: number;
	truncated: boolean;
}

interface ProcessRecord {
	child: ChildProcessByStdio<null, Readable, Readable>;
	command: string;
	startedAt: string;
	logs: string;
	exited?: { code: number | null; at: string };
}

const BACKGROUND_PROCESSES = new Map<string, ProcessRecord>();
let nextProcessId = 1;

function deniedPattern(command: string): string | null {
	for (const pattern of DENY_PATTERNS) {
		if (pattern.test(command)) return pattern.source;
	}
	return null;
}

function isInsidePath(root: string, target: string): boolean {
	const relative = path.relative(path.resolve(root), path.resolve(target));
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function truncate(text: string): { text: string; truncated: boolean } {
	let output = text;
	let truncated = false;
	if (output.length > MAX_OUTPUT_BYTES) {
		output = output.slice(0, MAX_OUTPUT_BYTES);
		truncated = true;
	}
	const lines = output.split('\n');
	if (lines.length > MAX_OUTPUT_LINES) {
		output = lines.slice(0, MAX_OUTPUT_LINES).join('\n');
		truncated = true;
	}
	return { text: output, truncated };
}

export const execTool: AgentTool<ExecArgs, ExecDetails> = {
	name: 'exec',
	description:
		'Run a shell command in the workspace. Output is capped at 200 lines / 16KB. Use for ls, git, build, tests. Use python3 for Python scripts unless the project specifies another command.',
	schema: {
		type: 'object',
		properties: {
			command: { type: 'string', description: 'Shell command to execute.' },
			workdir: { type: 'string', description: 'Working directory (relative or absolute).' },
			timeoutMs: {
				type: 'number',
				description: `Timeout in milliseconds (default ${TOOL_LIMITS.exec.timeoutMs}). Set to 0 to disable the timeout.`,
			},
			env: { type: 'object', description: 'Extra environment variables.' },
			background: {
				type: 'boolean',
				description: 'Start in the background and return a process id.',
			},
		},
		required: ['command'],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(args, ctx) {
		const command = String(args.command ?? '').trim();
		if (!command) {
			return {
				...textResult('exec: empty command', true),
				details: { exitCode: -1, durationMs: 0, truncated: false },
			};
		}
		const denied = deniedPattern(command);
		if (denied) {
			return {
				...textResult(`exec: denied by safety policy (pattern: ${denied})`, true),
				details: { exitCode: -1, durationMs: 0, truncated: false },
			};
		}
		const cwd = args.workdir
			? path.isAbsolute(args.workdir)
				? args.workdir
				: path.resolve(ctx.workspace, args.workdir)
			: ctx.workspace;
		if (
			(ctx.fsPolicy?.workspaceOnly === true || ctx.fsPolicy?.writeWorkspaceOnly === true) &&
			!isInsidePath(ctx.workspace, cwd)
		) {
			return {
				...textResult('exec: workdir is outside the workspace.', true),
				details: { exitCode: -1, durationMs: 0, truncated: false },
			};
		}
		if (args.background) return runBackground(command, cwd, args.env);
		const timeoutMs =
			typeof args.timeoutMs === 'number' && Number.isFinite(args.timeoutMs)
				? Math.floor(args.timeoutMs)
				: DEFAULT_TIMEOUT_MS;
		return runForeground(command, cwd, args.env, timeoutMs > 0 ? timeoutMs : null, ctx.signal);
	},
};

export const processTool: AgentTool<{ action: 'list' | 'log' | 'kill'; id?: string }> = {
	name: 'process',
	description:
		'List, inspect logs for, or kill background processes started with exec background=true.',
	schema: {
		type: 'object',
		properties: {
			action: { type: 'string', enum: ['list', 'log', 'kill'] },
			id: { type: 'string' },
		},
		required: ['action'],
		additionalProperties: false,
	},
	async execute(args) {
		if (args.action === 'list') {
			const rows = [...BACKGROUND_PROCESSES.entries()].map(([id, process]) => ({
				id,
				command: process.command,
				startedAt: process.startedAt,
				exited: process.exited,
			}));
			return textResult(rows.length ? JSON.stringify(rows, null, 2) : 'No background processes.');
		}
		if (!args.id) return textResult('process: id is required', true);
		const record = BACKGROUND_PROCESSES.get(args.id);
		if (!record) return textResult(`process: unknown id ${args.id}`, true);
		if (args.action === 'log') return textResult(truncate(record.logs).text || '(no output)');
		record.child.kill('SIGTERM');
		BACKGROUND_PROCESSES.delete(args.id);
		return textResult(`killed process ${args.id}`);
	},
};

function runBackground(
	command: string,
	cwd: string,
	envExtra: Record<string, string> | undefined
): ReturnType<typeof formatResult> {
	const isWin = process.platform === 'win32';
	const shell = isWin ? 'cmd.exe' : '/bin/bash';
	const shellArgs = isWin ? ['/c', command] : ['-lc', command];
	const child = spawn(shell, shellArgs, {
		cwd,
		env: { ...process.env, ...(envExtra ?? {}) },
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	const id = String(nextProcessId++);
	const record: ProcessRecord = {
		child,
		command,
		startedAt: new Date().toISOString(),
		logs: '',
	};
	BACKGROUND_PROCESSES.set(id, record);
	child.stdout.on('data', (data: Buffer) => {
		record.logs = truncate(record.logs + data.toString('utf8')).text;
	});
	child.stderr.on('data', (data: Buffer) => {
		record.logs = truncate(record.logs + data.toString('utf8')).text;
	});
	child.on('close', (code) => {
		record.exited = { code, at: new Date().toISOString() };
	});
	child.on('error', (error) => {
		record.logs = truncate(record.logs + error.message).text;
	});
	return {
		status: 'ok',
		content: [
			{ type: 'text', text: `started background process ${id} (pid ${child.pid ?? 'unknown'})` },
		],
		details: { exitCode: 0, durationMs: 0, truncated: false },
	};
}

function runForeground(
	command: string,
	cwd: string,
	envExtra: Record<string, string> | undefined,
	timeoutMs: number | null,
	signal?: AbortSignal
): Promise<ReturnType<typeof formatResult>> {
	return new Promise((resolve) => {
		const start = Date.now();
		const isWin = process.platform === 'win32';
		const shell = isWin ? 'cmd.exe' : '/bin/bash';
		const shellArgs = isWin ? ['/c', command] : ['-lc', command];
		const child = spawn(shell, shellArgs, {
			cwd,
			env: { ...process.env, ...(envExtra ?? {}) },
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let output = '';
		let settled = false;
		const timer =
			timeoutMs === null
				? null
				: setTimeout(() => {
						if (settled) return;
						child.kill('SIGTERM');
					}, timeoutMs);
		const abort = () => child.kill('SIGTERM');
		signal?.addEventListener('abort', abort, { once: true });
		const append = (prefix: string, data: Buffer) => {
			output = truncate(output + `${prefix}${data.toString('utf8')}`).text;
		};
		child.stdout.on('data', (data: Buffer) => append('', data));
		child.stderr.on('data', (data: Buffer) => append('', data));
		child.on('close', (code) => {
			settled = true;
			if (timer) clearTimeout(timer);
			signal?.removeEventListener('abort', abort);
			const clipped = truncate(output.trimEnd());
			resolve(formatResult(code, Date.now() - start, clipped));
		});
		child.on('error', (error) => {
			settled = true;
			if (timer) clearTimeout(timer);
			signal?.removeEventListener('abort', abort);
			resolve(formatResult(-1, Date.now() - start, truncate(error.message), true));
		});
	});
}

function formatResult(
	exitCode: number | null,
	durationMs: number,
	output: { text: string; truncated: boolean },
	forceError = false
) {
	const status = forceError || exitCode !== 0 ? 'error' : 'ok';
	const suffix = output.truncated ? '\n[truncated]' : '';
	return {
		status,
		content: [
			{
				type: 'text' as const,
				text: `exit=${exitCode} durationMs=${durationMs}\n${output.text}${suffix}`,
			},
		],
		details: { exitCode, durationMs, truncated: output.truncated },
	};
}
