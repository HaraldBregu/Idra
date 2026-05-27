import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { checkFilePolicy } from '../files/policy';
import { checkFsRestriction, outsidePathNeedsApproval, resolveAbs } from '../files/path-policy';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_OUTPUT_BYTES = 32_768;
const MAX_OUTPUT_BYTES = 131_072;
const SCRIPT_INTERPRETERS = ['auto', 'bash', 'sh', 'python3', 'node'] as const;

type ScriptInterpreter = (typeof SCRIPT_INTERPRETERS)[number];

interface ScriptRunArgs {
	path: string;
	args?: string[];
	cwd?: string;
	interpreter?: ScriptInterpreter;
	timeoutMs?: number;
	maxOutputBytes?: number;
}

type OutputCapture = {
	chunks: Buffer[];
	bytes: number;
	truncated: boolean;
};

type ProcessResult = {
	exitCode: number | null;
	signal: NodeJS.Signals | null;
	stdout: string;
	stderr: string;
	stdoutTruncated: boolean;
	stderrTruncated: boolean;
	timedOut: boolean;
	durationMs: number;
	error?: Error;
};

export const scriptRunTool: AgentTool<ScriptRunArgs> = {
	name: 'script_run',
	description:
		'Run an existing script file with optional string args. Uses policy checks for the script path and working directory; does not run arbitrary shell command text.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string', description: 'Absolute or workspace-relative script path.' },
			args: {
				type: 'array',
				items: { type: 'string' },
				description: 'Arguments passed to the script without shell interpolation.',
			},
			cwd: {
				type: 'string',
				description: 'Working directory. Defaults to the workspace.',
			},
			interpreter: {
				type: 'string',
				enum: SCRIPT_INTERPRETERS,
				description: 'Interpreter override. Defaults to auto-detect from extension or executable bit.',
			},
			timeoutMs: {
				type: 'number',
				description: 'Execution timeout in milliseconds. Default 30000, max 120000.',
			},
			maxOutputBytes: {
				type: 'number',
				description: 'Maximum stdout/stderr bytes captured per stream. Default 32768, max 131072.',
			},
		},
		required: ['path'],
		additionalProperties: false,
	},
	needsApproval: (args, ctx) =>
		outsidePathNeedsApproval(ctx, args.path, ['read']) ||
		(typeof args.cwd === 'string' && outsidePathNeedsApproval(ctx, args.cwd, ['write'])),
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly) {
			return textResult('script_run: disabled by read-only filesystem policy.', true);
		}
		if (typeof args.path !== 'string' || args.path.trim() === '') {
			return textResult('script_run: path is required.', true);
		}
		const scriptArgs = parseArgs(args.args);
		if (typeof scriptArgs === 'string') return textResult(`script_run: ${scriptArgs}`, true);
		const interpreter = parseInterpreter(args.interpreter);
		if (!interpreter) return textResult('script_run: unsupported interpreter.', true);
		const timeoutMs = limitNumber(args.timeoutMs, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
		const maxOutputBytes = limitNumber(args.maxOutputBytes, DEFAULT_OUTPUT_BYTES, MAX_OUTPUT_BYTES);

		let scriptAbs: string;
		let cwdAbs: string;
		try {
			scriptAbs = resolveAbs(ctx.workspace, args.path);
			cwdAbs = args.cwd ? resolveAbs(ctx.workspace, args.cwd) : ctx.workspace;
		} catch (err) {
			return textResult(`script_run: ${(err as Error).message}`, true);
		}

		const scriptRestricted = checkFsRestriction(ctx, scriptAbs, 'script_run', true);
		if (scriptRestricted) return textResult(scriptRestricted, true);
		const cwdRestricted = checkFsRestriction(ctx, cwdAbs, 'script_run', true);
		if (cwdRestricted) return textResult(cwdRestricted, true);
		const denied = checkFilePolicy(ctx, 'script_run', [
			{ path: scriptAbs, permission: 'read' },
			{ path: cwdAbs, permission: 'write' },
		]);
		if (denied) return textResult(denied, true);

		try {
			const scriptStat = await fs.stat(scriptAbs);
			if (!scriptStat.isFile()) return textResult(`script_run: ${args.path} is not a file`, true);
			const cwdStat = await fs.stat(cwdAbs);
			if (!cwdStat.isDirectory()) return textResult(`script_run: cwd is not a directory: ${cwdAbs}`, true);
			const command = await resolveScriptCommand(scriptAbs, interpreter, scriptStat.mode);
			if (!command) {
				return textResult(
					'script_run: cannot infer interpreter. Provide interpreter or use a .sh, .py, .js, .mjs, or executable script.',
					true
				);
			}
			const startedAt = Date.now();
			const result = await runProcess({
				command: command.command,
				args: [...command.args, ...scriptArgs],
				cwd: cwdAbs,
				timeoutMs,
				maxOutputBytes,
				signal: ctx.signal,
			});
			const statusOk = !result.error && !result.timedOut && result.exitCode === 0;
			const lines = [
				`command: ${formatCommand(command.command, [...command.args, ...scriptArgs])}`,
				`cwd: ${cwdAbs}`,
				`exitCode: ${result.exitCode ?? 'null'}`,
				`signal: ${result.signal ?? 'none'}`,
				`durationMs: ${Date.now() - startedAt}`,
				'stdout:',
				result.stdout || '(empty)',
				'stderr:',
				result.stderr || '(empty)',
			];
			if (result.stdoutTruncated) lines.push(`stdout truncated at ${maxOutputBytes} bytes`);
			if (result.stderrTruncated) lines.push(`stderr truncated at ${maxOutputBytes} bytes`);
			if (result.timedOut) lines.push(`timed out after ${timeoutMs}ms`);
			if (result.error) lines.push(`error: ${result.error.message}`);
			return {
				status: statusOk ? 'ok' : 'error',
				content: [{ type: 'text', text: lines.join('\n') }],
				details: {
					path: args.path,
					absolutePath: scriptAbs,
					cwd: cwdAbs,
					exitCode: result.exitCode,
					signal: result.signal,
					durationMs: result.durationMs,
					timedOut: result.timedOut,
					stdoutTruncated: result.stdoutTruncated,
					stderrTruncated: result.stderrTruncated,
				},
			};
		} catch (err) {
			return textResult(`script_run: ${(err as Error).message}`, true);
		}
	},
};

function parseArgs(value: unknown): string[] | string {
	if (value === undefined) return [];
	if (!Array.isArray(value)) return 'args must be an array of strings.';
	const out: string[] = [];
	for (const arg of value) {
		if (typeof arg !== 'string') return 'args must be an array of strings.';
		out.push(arg);
	}
	return out;
}

function parseInterpreter(value: unknown): ScriptInterpreter | null {
	if (value === undefined) return 'auto';
	return SCRIPT_INTERPRETERS.includes(value as ScriptInterpreter)
		? (value as ScriptInterpreter)
		: null;
}

function limitNumber(value: unknown, fallback: number, max: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
	return Math.max(1, Math.min(Math.floor(value), max));
}

async function resolveScriptCommand(
	scriptAbs: string,
	interpreter: ScriptInterpreter,
	mode: number
): Promise<{ command: string; args: string[] } | null> {
	if (interpreter === 'bash' || interpreter === 'sh' || interpreter === 'python3') {
		return { command: interpreter, args: [scriptAbs] };
	}
	if (interpreter === 'node') return { command: process.execPath, args: [scriptAbs] };

	switch (path.extname(scriptAbs).toLowerCase()) {
		case '.sh':
		case '.bash':
			return { command: 'bash', args: [scriptAbs] };
		case '.py':
			return { command: 'python3', args: [scriptAbs] };
		case '.js':
		case '.mjs':
		case '.cjs':
			return { command: process.execPath, args: [scriptAbs] };
		default:
			if (process.platform !== 'win32' && (mode & 0o111) !== 0) {
				return { command: scriptAbs, args: [] };
			}
			return null;
	}
}

function createCapture(): OutputCapture {
	return { chunks: [], bytes: 0, truncated: false };
}

function appendCapture(capture: OutputCapture, chunk: Buffer, maxBytes: number): void {
	if (capture.bytes >= maxBytes) {
		capture.truncated = true;
		return;
	}
	const remaining = maxBytes - capture.bytes;
	const next = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
	capture.chunks.push(next);
	capture.bytes += next.length;
	if (next.length < chunk.length) capture.truncated = true;
}

function captureText(capture: OutputCapture): string {
	return Buffer.concat(capture.chunks).toString('utf8').trimEnd();
}

function runProcess(input: {
	command: string;
	args: string[];
	cwd: string;
	timeoutMs: number;
	maxOutputBytes: number;
	signal?: AbortSignal;
}): Promise<ProcessResult> {
	return new Promise((resolve) => {
		const startedAt = Date.now();
		const stdout = createCapture();
		const stderr = createCapture();
		let timedOut = false;
		let settled = false;
		const child = spawn(input.command, input.args, {
			cwd: input.cwd,
			env: process.env,
			shell: false,
			windowsHide: true,
		});
		const finish = (result: Partial<ProcessResult>): void => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			input.signal?.removeEventListener('abort', abort);
			resolve({
				exitCode: result.exitCode ?? null,
				signal: result.signal ?? null,
				stdout: captureText(stdout),
				stderr: captureText(stderr),
				stdoutTruncated: stdout.truncated,
				stderrTruncated: stderr.truncated,
				timedOut,
				durationMs: Date.now() - startedAt,
				error: result.error,
			});
		};
		const abort = (): void => {
			timedOut = input.signal?.aborted === true ? false : timedOut;
			child.kill('SIGTERM');
		};
		const timeout = setTimeout(() => {
			timedOut = true;
			child.kill('SIGTERM');
		}, input.timeoutMs);
		input.signal?.addEventListener('abort', abort, { once: true });
		child.stdout.on('data', (chunk: Buffer) => appendCapture(stdout, chunk, input.maxOutputBytes));
		child.stderr.on('data', (chunk: Buffer) => appendCapture(stderr, chunk, input.maxOutputBytes));
		child.on('error', (error) => finish({ error }));
		child.on('close', (exitCode, signal) => finish({ exitCode, signal }));
	});
}

function formatCommand(command: string, args: readonly string[]): string {
	return [command, ...args].map(formatCommandPart).join(' ');
}

function formatCommandPart(value: string): string {
	return /^[A-Za-z0-9_/:=.+-]+$/.test(value) ? value : JSON.stringify(value);
}
