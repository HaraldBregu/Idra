import { spawn } from 'node:child_process';
import path from 'node:path';
import type { AgentTool } from './types';
import { textResult } from './types';

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

const MAX_OUTPUT_BYTES = 16 * 1024;
const MAX_OUTPUT_LINES = 200;
const DEFAULT_TIMEOUT_MS = 120_000;

interface ExecArgs {
	command: string;
	workdir?: string;
	timeoutMs?: number;
	env?: Record<string, string>;
}

interface ExecDetails {
	exitCode: number | null;
	durationMs: number;
	truncated: boolean;
}

function isDenied(command: string): string | null {
	for (const pat of DENY_PATTERNS) if (pat.test(command)) return pat.source;
	return null;
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
		'Run a shell command in the workspace. Output is capped at 200 lines / 16KB. Use for ls, git, build, tests.',
	schema: {
		type: 'object',
		properties: {
			command: { type: 'string', description: 'Shell command to execute.' },
			workdir: { type: 'string', description: 'Working directory (relative or absolute).' },
			timeoutMs: { type: 'number', description: 'Timeout in milliseconds (default 120000).' },
			env: { type: 'object', description: 'Extra environment variables.' },
		},
		required: ['command'],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(args, ctx) {
		const command = String(args.command ?? '').trim();
		if (!command) return textResult('exec: empty command', true);
		const denied = isDenied(command);
		if (denied) return textResult(`exec: denied by safety policy (pattern: ${denied})`, true);
		const cwd = args.workdir
			? path.isAbsolute(args.workdir)
				? args.workdir
				: path.resolve(ctx.workspace, args.workdir)
			: ctx.workspace;
		return runForeground(command, cwd, args.env, args.timeoutMs ?? DEFAULT_TIMEOUT_MS);
	},
};

function runForeground(
	command: string,
	cwd: string,
	envExtra: Record<string, string> | undefined,
	timeoutMs: number
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

		let stdout = '';
		let stderr = '';
		let killed = false;

		const timer = setTimeout(() => {
			killed = true;
			child.kill('SIGKILL');
		}, timeoutMs);

		child.stdout.on('data', (d: Buffer) => {
			stdout += d.toString('utf8');
			if (stdout.length > MAX_OUTPUT_BYTES * 2) stdout = stdout.slice(-MAX_OUTPUT_BYTES * 2);
		});
		child.stderr.on('data', (d: Buffer) => {
			stderr += d.toString('utf8');
			if (stderr.length > MAX_OUTPUT_BYTES * 2) stderr = stderr.slice(-MAX_OUTPUT_BYTES * 2);
		});

		child.on('close', (code) => {
			clearTimeout(timer);
			const exitCode = killed ? -1 : code;
			resolve(formatResult(command, exitCode, killed, stdout, stderr, Date.now() - start));
		});

		child.on('error', (err) => {
			clearTimeout(timer);
			resolve(formatResult(command, -1, false, '', err.message, Date.now() - start));
		});
	});
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
