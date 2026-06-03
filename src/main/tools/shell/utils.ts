import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable } from 'node:stream';
import type { AgentToolResult } from '../base/tool';
import { TOOL_LIMITS } from '../base/limits';

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

export const DEFAULT_TIMEOUT_MS = TOOL_LIMITS.exec.timeoutMs;

export interface ExecDetails {
	exitCode: number | null;
	durationMs: number;
	truncated: boolean;
}

export interface ProcessRecord {
	child: ChildProcessByStdio<null, Readable, Readable>;
	command: string;
	startedAt: string;
	logs: string;
	exited?: { code: number | null; at: string };
}

export const BACKGROUND_PROCESSES = new Map<string, ProcessRecord>();

let nextProcessId = 1;

export function deniedPattern(command: string): string | null {
	for (const pattern of DENY_PATTERNS) {
		if (pattern.test(command)) return pattern.source;
	}
	return null;
}

export function truncate(text: string): { text: string; truncated: boolean } {
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

export function runBackground(
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

export function runForeground(
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

export function formatResult(
	exitCode: number | null,
	durationMs: number,
	output: { text: string; truncated: boolean },
	forceError = false
): AgentToolResult<ExecDetails> {
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
