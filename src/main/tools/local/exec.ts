import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable } from 'node:stream';
import path from 'node:path';
import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { TOOL_LIMITS } from '../core/limits';

const DENY_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
	{ pattern: /\brm\s+-rf\s+\/(?:\s|$)/, reason: 'refusing to remove filesystem root' },
	{ pattern: /\brm\s+-rf\s+\/\*/, reason: 'refusing to remove filesystem root' },
	{
		pattern: /\bgit\s+push\s+.*--force.*\b(main|master)\b/,
		reason: 'refusing force-push to main/master',
	},
	{ pattern: /\b:(){:|:&};:/, reason: 'refusing fork bomb' },
	{ pattern: /\bmkfs\b/, reason: 'refusing filesystem formatting command' },
	{ pattern: /\bdd\s+if=.*of=\/dev\//, reason: 'refusing raw device write' },
	{ pattern: /\bshutdown\b/, reason: 'refusing host shutdown' },
	{ pattern: /\breboot\b/, reason: 'refusing host reboot' },
	{
		pattern: /\bcrontab\b|\blaunchctl\b|\bschtasks(?:\.exe)?\b|\bsystemctl\b.*\btimers?\b/i,
		reason: 'system scheduler commands are blocked; use the Friday cron tool',
	},
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

function isDenied(command: string): string | null {
	for (const entry of DENY_PATTERNS) if (entry.pattern.test(command)) return entry.reason;
	return null;
}

function isInsidePath(root: string, target: string): boolean {
	const relative = path.relative(path.resolve(root), path.resolve(target));
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveWorkdir(workspace: string, workdir: string | undefined): string {
	return workdir
		? path.isAbsolute(workdir)
			? path.resolve(workdir)
			: path.resolve(workspace, workdir)
		: workspace;
}

function truncate(buf: string): { text: string; truncated: boolean } {
	let out = buf;
	let truncated = false;
	if (out.length > MAX_OUTPUT_BYTES) {
		out = out.slice(0, MAX_OUTPUT_BYTES);
		truncated = true;
	}
	const lines = out.split('\n');
	if (lines.length > MAX_OUTPUT_LINES) {
		out = lines.slice(0, MAX_OUTPUT_LINES).join('\n');
		truncated = true;
	}
	return { text: out, truncated };
}

export const execTool: AgentTool<ExecArgs, ExecDetails> = {
	name: 'exec',
	description:
		'Run a shell command in the workspace. Output is capped at 200 lines / 16KB. Use for ls, git, build, tests. Use python3 for Python scripts unless the project specifies another command. Do not use host schedulers such as crontab, launchctl, systemctl timers, or schtasks; use the cron tool for future or recurring work.',
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
	needsApproval: (args, ctx) => !isInsidePath(ctx.workspace, resolveWorkdir(ctx.workspace, args.workdir)),
	async execute(args, ctx) {
		const command = String(args.command ?? '').trim();
		if (!command) {
			return {
				...textResult('exec: empty command', true),
				details: { exitCode: -1, durationMs: 0, truncated: false },
			};
		}
		const denied = isDenied(command);
		if (denied) {
			return {
				...textResult(`exec: denied by safety policy (${denied})`, true),
				details: { exitCode: -1, durationMs: 0, truncated: false },
			};
		}
		const cwd = resolveWorkdir(ctx.workspace, args.workdir);
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
			const rows = [...BACKGROUND_PROCESSES.entries()].map(([id, p]) => ({
				id,
				command: p.command,
				startedAt: p.startedAt,
				exited: p.exited,
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
	child.stdout.on('data', (d: Buffer) => {
		record.logs = truncate(record.logs + d.toString('utf8')).text;
	});
	child.stderr.on('data', (d: Buffer) => {
		record.logs = truncate(record.logs + d.toString('utf8')).text;
	});
	child.on('close', (code) => {
		record.exited = { code, at: new Date().toISOString() };
	});
	child.on('error', (err) => {
		record.logs = truncate(record.logs + err.message).text;
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
			detached: !isWin,
		});

		let stdout = '';
		let stderr = '';
		let killed = false;
		let settled = false;

		const finish = (code: number | null, aborted = false): void => {
			if (settled) return;
			settled = true;
			if (timer) clearTimeout(timer);
			signal?.removeEventListener('abort', abort);
			const exitCode = killed || aborted ? -1 : code;
			resolve(
				formatResult(command, exitCode, killed || aborted, stdout, stderr, Date.now() - start)
			);
		};

		const abort = (): void => {
			killed = true;
			killProcessTree(child);
		};

		const timer =
			timeoutMs === null
				? undefined
				: setTimeout(() => {
						killed = true;
						killProcessTree(child);
					}, timeoutMs);
		if (signal?.aborted) abort();
		else signal?.addEventListener('abort', abort, { once: true });

		child.stdout.on('data', (d: Buffer) => {
			stdout += d.toString('utf8');
			if (stdout.length > MAX_OUTPUT_BYTES * 2) stdout = stdout.slice(-MAX_OUTPUT_BYTES * 2);
		});
		child.stderr.on('data', (d: Buffer) => {
			stderr += d.toString('utf8');
			if (stderr.length > MAX_OUTPUT_BYTES * 2) stderr = stderr.slice(-MAX_OUTPUT_BYTES * 2);
		});

		child.on('close', (code) => {
			finish(code);
		});

		child.on('error', (err) => {
			stderr += err.message;
			finish(-1);
		});
	});
}

function killProcessTree(child: ChildProcessByStdio<null, Readable, Readable>): void {
	if (child.pid === undefined) return;
	if (process.platform === 'win32') {
		child.kill('SIGKILL');
		return;
	}
	try {
		process.kill(-child.pid, 'SIGKILL');
	} catch {
		child.kill('SIGKILL');
	}
}

function formatResult(
	command: string,
	exitCode: number | null,
	killed: boolean,
	stdout: string,
	stderr: string,
	durationMs: number
): { status: 'ok' | 'error'; content: { type: 'text'; text: string }[]; details: ExecDetails } {
	const out = truncate(stdout);
	const err = truncate(stderr);
	const parts = [
		`$ ${command}`,
		`exit=${exitCode} duration=${durationMs}ms${killed ? ' (killed by timeout)' : ''}`,
	];
	if (out.text) parts.push(`--- stdout ---\n${out.text}`);
	if (err.text) parts.push(`--- stderr ---\n${err.text}`);
	if (out.truncated || err.truncated) parts.push('(output truncated)');
	return {
		status: exitCode === 0 ? 'ok' : 'error',
		content: [{ type: 'text', text: parts.join('\n') }],
		details: { exitCode, durationMs, truncated: out.truncated || err.truncated },
	};
}
