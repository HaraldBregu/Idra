import { spawn } from 'node:child_process';
import path from 'node:path';
import type { AgentTool, AgentToolUpdate } from '../common';
import { markCoreTool } from '../common';
import { asParamsRecord, readBooleanParam, readNumberParam, readStringParam } from '../params';
import { TOOL_LIMITS } from '../limits';

export type ExecToolOptions = {
	workspaceDir: string;
	defaultTimeoutMs?: number;
	maxOutputBytes?: number;
};

export type ExecDetails = {
	command: string;
	cwd: string;
	exitCode: number | null;
	durationMs: number;
	truncated: boolean;
	aborted: boolean;
};

const DEFAULT_TIMEOUT_MS = TOOL_LIMITS.exec.timeoutMs;
const DEFAULT_MAX_OUTPUT_BYTES = TOOL_LIMITS.exec.maxOutputBytes;
const DENY_PATTERNS = [
	/\brm\s+-rf\s+\/(?:\s|$)/,
	/\brm\s+-rf\s+\/\*/,
	/\bmkfs\b/,
	/\bdd\s+if=.*of=\/dev\//,
	/\bshutdown\b/,
	/\breboot\b/,
	/\bgit\s+push\b.*\s--force\b/,
];

function resolveCwd(workspaceDir: string, requested?: string): string {
	if (!requested) return workspaceDir;
	return path.isAbsolute(requested) ? path.resolve(requested) : path.resolve(workspaceDir, requested);
}

function truncate(text: string, maxBytes: number): { text: string; truncated: boolean } {
	if (Buffer.byteLength(text, 'utf8') <= maxBytes) return { text, truncated: false };
	return { text: text.slice(0, maxBytes), truncated: true };
}

function deniedPattern(command: string): string | undefined {
	return DENY_PATTERNS.find((pattern) => pattern.test(command))?.source;
}

export function createExecTool(options: ExecToolOptions): AgentTool<Record<string, unknown>, ExecDetails> {
	return markCoreTool({
		name: 'exec',
		label: 'Run Command',
		description:
			'Run a shell command in the workspace. Output is capped and dangerous command patterns are denied.',
		parameters: {
			type: 'object',
			properties: {
				command: { type: 'string', description: 'Shell command to execute.' },
				workdir: { type: 'string', description: 'Workspace-relative or absolute working directory.' },
				timeoutMs: { type: 'number', description: 'Timeout in milliseconds.' },
				background: { type: 'boolean', description: 'Reserved for future background execution support.' },
			},
			required: ['command'],
			additionalProperties: false,
		},
		displaySummary: 'Runs a shell command.',
		async execute(_toolCallId, params, signal, onUpdate) {
			const record = asParamsRecord(params);
			const command = readStringParam(record, 'command', { required: true, minLength: 1 })!;
			const cwd = resolveCwd(options.workspaceDir, readStringParam(record, 'workdir'));
			const timeoutMs = readNumberParam(record, 'timeoutMs', {
				defaultValue: options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS,
				min: 1,
					max: TOOL_LIMITS.exec.maxTimeoutMs,
				integer: true,
			})!;
			readBooleanParam(record, 'background', { defaultValue: false });
			const denied = deniedPattern(command);
			if (denied) {
				return {
					content: [{ type: 'text', text: `exec: denied by safety policy (pattern: ${denied})` }],
					details: {
						command,
						cwd,
						exitCode: -1,
						durationMs: 0,
						truncated: false,
						aborted: false,
					},
				};
			}
			return runCommand(command, cwd, timeoutMs, options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES, signal, onUpdate);
		},
	});
}

function runCommand(
	command: string,
	cwd: string,
	timeoutMs: number,
	maxOutputBytes: number,
	signal?: AbortSignal,
	onUpdate?: (update: AgentToolUpdate) => void
): Promise<{ content: { type: 'text'; text: string }[]; details: ExecDetails }> {
	return new Promise((resolve) => {
		const start = Date.now();
		const child = spawn(process.platform === 'win32' ? 'cmd.exe' : '/bin/bash', process.platform === 'win32' ? ['/c', command] : ['-lc', command], {
			cwd,
			env: process.env,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let stdout = '';
		let stderr = '';
		let settled = false;
		let aborted = signal?.aborted === true;

		const finish = (exitCode: number | null): void => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			signal?.removeEventListener('abort', abort);
			const out = truncate(stdout, maxOutputBytes);
			const err = truncate(stderr, maxOutputBytes);
			const durationMs = Date.now() - start;
			const parts = [
				`$ ${command}`,
				`exit=${exitCode} duration=${durationMs}ms${aborted ? ' (aborted)' : ''}`,
			];
			if (out.text) parts.push(`--- stdout ---\n${out.text}`);
			if (err.text) parts.push(`--- stderr ---\n${err.text}`);
			if (out.truncated || err.truncated) parts.push('(output truncated)');
			resolve({
				content: [{ type: 'text', text: parts.join('\n') }],
				details: {
					command,
					cwd,
					exitCode,
					durationMs,
					truncated: out.truncated || err.truncated,
					aborted,
				},
			});
		};

		const abort = (): void => {
			aborted = true;
			child.kill('SIGTERM');
			setTimeout(() => {
				if (!settled) child.kill('SIGKILL');
			}, 250);
		};

		const timer = setTimeout(() => {
			aborted = true;
			child.kill('SIGKILL');
		}, timeoutMs);

		if (signal?.aborted) abort();
		else signal?.addEventListener('abort', abort, { once: true });

		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString('utf8');
			if (stdout.length > maxOutputBytes * 2) stdout = stdout.slice(-maxOutputBytes * 2);
			onUpdate?.({ type: 'tool.execution.stdout', details: { bytes: stdout.length } });
		});
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString('utf8');
			if (stderr.length > maxOutputBytes * 2) stderr = stderr.slice(-maxOutputBytes * 2);
			onUpdate?.({ type: 'tool.execution.stderr', details: { bytes: stderr.length } });
		});
		child.on('error', (error) => {
			stderr += error.message;
			finish(-1);
		});
		child.on('close', (code) => finish(aborted ? -1 : code));
	});
}
