import { spawn } from 'node:child_process';
import type { AgentToolResult } from './base/tool';

export type ProcessOutput = {
	exitCode: number | null;
	signal: NodeJS.Signals | null;
	stdout: string;
	stderr: string;
	timedOut: boolean;
	durationMs: number;
};

export function runProcess(input: {
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

export function commandResult(toolName: string, output: ProcessOutput): AgentToolResult {
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

export function limitNumber(value: unknown, fallback: number, max: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
	return Math.max(1, Math.min(Math.floor(value), max));
}
