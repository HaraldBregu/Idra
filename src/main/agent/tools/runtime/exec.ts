import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { BaseTool, Context } from '../../types';
import { registry } from './process';

function resolvePath(p: string): string {
	if (p === '~') return os.homedir();
	if (p.startsWith('~/') || p.startsWith('~\\')) return path.resolve(os.homedir(), p.slice(2));
	return path.resolve(p);
}

interface ExecResult {
	command: string;
	workdir: string;
	background: boolean;
	pty: boolean;
	pid?: number;
	sessionId?: string;
	exitCode?: number | null;
	signal?: NodeJS.Signals | null;
	stdout: string;
	stderr: string;
	durationMs: number;
	timedOut?: boolean;
	stdoutTruncated?: boolean;
	stderrTruncated?: boolean;
}

export class ExecTool extends BaseTool {
	readonly name = 'exec';
	readonly description =
		'Run a shell command from the workspace or a chosen working directory. ' +
		'Use it for builds, tests, searches, and other command-line checks; set background or yieldMs for long-running commands, timeout to stop slow commands, and pty for TTY-only CLIs.';
	readonly schema = {
		type: 'object',
		required: ['command'],
		properties: {
			command: {
				type: 'string',
				description: 'Shell command to execute',
			},
			workdir: {
				type: 'string',
				description:
					'Working directory. Relative paths resolve from the workspace; ~ expands to the user home.',
			},
			env: {
				type: 'object',
				additionalProperties: { type: 'string' },
			},
			yieldMs: {
				type: 'number',
				description: 'Milliseconds to wait before backgrounding (default 10000)',
			},
			background: {
				type: 'boolean',
				description: 'Run in background immediately',
			},
			timeout: {
				type: 'number',
				description: 'Timeout in seconds (optional, kills process on expiry)',
			},
			pty: {
				type: 'boolean',
				description:
					'Run in a pseudo-terminal (PTY) when available (TTY-required CLIs, coding agents)',
			},
			elevated: {
				type: 'boolean',
				description: 'Run on the host with elevated permissions (if allowed)',
			},
			host: {
				type: 'string',
				enum: ['auto', 'sandbox', 'gateway', 'node'],
				description: 'Exec host/target (auto|sandbox|gateway|node).',
			},
			security: {
				type: 'string',
				description:
					'Ignored for normal calls; exec security is set by tools.exec.security and host approvals.',
			},
			ask: {
				type: 'string',
				description:
					'Baseline ask comes from tools.exec.ask and host approvals; channel-origin calls ignore per-call ask when effective host ask is off.',
			},
			node: {
				type: 'string',
				description: 'Node id/name for host=node.',
			},
		},
	};

	constructor(context: Context) {
		super(context);
	}

	async run(input: Record<string, unknown>): Promise<ExecResult> {
		const command = input.command;
		const workdir = input.workdir;
		const envInput = input.env;
		const yieldMsInput = input.yieldMs;
		const backgroundInput = input.background;
		const timeoutInput = input.timeout;
		const ptyInput = input.pty;
		const elevatedInput = input.elevated;
		const hostInput = input.host;
		const securityInput = input.security;
		const askInput = input.ask;
		const nodeInput = input.node;

		if (typeof command !== 'string' || !command.trim()) {
			throw new Error('exec requires a non-empty command.');
		}
		if (workdir !== undefined && (typeof workdir !== 'string' || !workdir.trim())) {
			throw new Error('exec workdir must be a non-empty string.');
		}
		if (
			yieldMsInput !== undefined &&
			(typeof yieldMsInput !== 'number' ||
				!Number.isFinite(yieldMsInput) ||
				yieldMsInput < 0)
		) {
			throw new Error('exec yieldMs must be a non-negative number.');
		}
		if (
			timeoutInput !== undefined &&
			(typeof timeoutInput !== 'number' ||
				!Number.isFinite(timeoutInput) ||
				timeoutInput <= 0)
		) {
			throw new Error('exec timeout must be a positive number.');
		}
		if (backgroundInput !== undefined && typeof backgroundInput !== 'boolean') {
			throw new Error('exec background must be a boolean.');
		}
		if (ptyInput !== undefined && typeof ptyInput !== 'boolean') {
			throw new Error('exec pty must be a boolean.');
		}
		if (elevatedInput !== undefined && typeof elevatedInput !== 'boolean') {
			throw new Error('exec elevated must be a boolean.');
		}
		if (
			hostInput !== undefined &&
			(hostInput !== 'auto' &&
				hostInput !== 'sandbox' &&
				hostInput !== 'gateway' &&
				hostInput !== 'node')
		) {
			throw new Error('exec host must be auto, sandbox, gateway, or node.');
		}
		if (securityInput !== undefined && typeof securityInput !== 'string') {
			throw new Error('exec security must be a string.');
		}
		if (askInput !== undefined && typeof askInput !== 'string') {
			throw new Error('exec ask must be a string.');
		}
		if (nodeInput !== undefined && typeof nodeInput !== 'string') {
			throw new Error('exec node must be a string.');
		}
		if (elevatedInput === true) {
			throw new Error('exec elevated mode is not available in this runtime.');
		}
		if (hostInput === 'gateway' || hostInput === 'node') {
			throw new Error(`exec host '${hostInput}' is not available in this runtime.`);
		}

		const env: NodeJS.ProcessEnv = { ...process.env };
		if (envInput !== undefined) {
			if (!envInput || typeof envInput !== 'object' || Array.isArray(envInput)) {
				throw new Error('exec env must be an object with string values.');
			}
			for (const [key, value] of Object.entries(envInput)) {
				if (typeof value !== 'string') {
					throw new Error('exec env must be an object with string values.');
				}
				env[key] = value;
			}
		}

		const cwd = resolvePath(workdir ?? '.');
		const yieldMs = yieldMsInput ?? 10000;
		const timeoutMs = timeoutInput === undefined ? undefined : timeoutInput * 1000;
		const startedAt = Date.now();
		const pty = ptyInput === true;
		const spawnCommand = pty ? 'script' : command;
		const spawnArgs = pty
			? process.platform === 'darwin' ||
				process.platform === 'freebsd' ||
				process.platform === 'openbsd' ||
				process.platform === 'netbsd'
				? ['-q', '/dev/null', process.env.SHELL ?? '/bin/sh', '-lc', command]
				: ['-q', '-e', '-c', command, '/dev/null']
			: [];
		const shell = !pty;

		if (backgroundInput === true) {
			const child = spawn(spawnCommand, spawnArgs, {
				cwd,
				env,
				shell,
				detached: true,
				stdio: 'ignore',
			});
			let timeoutTimer: NodeJS.Timeout | undefined;
			if (timeoutMs !== undefined) {
				timeoutTimer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
				timeoutTimer.unref();
			}
			return await new Promise<ExecResult>((resolve, reject) => {
				child.once('error', (error) => {
					if (timeoutTimer) clearTimeout(timeoutTimer);
					reject(error);
				});
				child.once('exit', () => {
					if (timeoutTimer) clearTimeout(timeoutTimer);
				});
				child.once('spawn', () => {
					child.unref();
					this.context.setPath(cwd);
					resolve({
						command,
						workdir: cwd,
						background: true,
						pty,
						pid: child.pid,
						stdout: '',
						stderr: '',
						durationMs: Date.now() - startedAt,
					});
				});
			});
		}

		const child = spawn(spawnCommand, spawnArgs, { cwd, env, shell });
		const maxOutputLength = 200000;
		let stdout = '';
		let stderr = '';
		let stdoutTruncated = false;
		let stderrTruncated = false;
		let timedOut = false;

		child.stdout.on('data', (chunk: Buffer | string) => {
			if (stdout.length >= maxOutputLength) {
				stdoutTruncated = true;
				return;
			}
			const next = stdout + chunk.toString();
			stdout = next.slice(0, maxOutputLength);
			stdoutTruncated = stdoutTruncated || next.length > maxOutputLength;
		});
		child.stderr.on('data', (chunk: Buffer | string) => {
			if (stderr.length >= maxOutputLength) {
				stderrTruncated = true;
				return;
			}
			const next = stderr + chunk.toString();
			stderr = next.slice(0, maxOutputLength);
			stderrTruncated = stderrTruncated || next.length > maxOutputLength;
		});

		return await new Promise<ExecResult>((resolve, reject) => {
			let settled = false;
			let timeoutTimer: NodeJS.Timeout | undefined;
			const yieldTimer = setTimeout(() => {
				if (settled) return;
				settled = true;

				// Register the still-running process as a trackable session.
				const sessionId = randomUUID();
				const session = registry.register({
					id: sessionId,
					pid: child.pid,
					command,
					workdir: cwd,
					startedAt,
					stdout,
					stderr,
					exitCode: undefined,
					exitSignal: undefined,
					exited: false,
					child,
				});

				// Redirect output buffering to the registry session.
				child.stdout.removeAllListeners('data');
				child.stderr.removeAllListeners('data');
				child.stdout.on('data', (chunk: Buffer | string) =>
					registry.append(session, 'stdout', chunk.toString())
				);
				child.stderr.on('data', (chunk: Buffer | string) =>
					registry.append(session, 'stderr', chunk.toString())
				);
				child.once('close', (exitCode, signal) => {
					session.exited = true;
					session.exitCode = exitCode;
					session.exitSignal = signal;
				});

				this.context.setPath(cwd);
				resolve({
					command,
					workdir: cwd,
					background: true,
					sessionId,
					pty,
					pid: child.pid,
					stdout,
					stderr,
					durationMs: Date.now() - startedAt,
					stdoutTruncated: stdoutTruncated || undefined,
					stderrTruncated: stderrTruncated || undefined,
				});
			}, yieldMs);

			if (timeoutMs !== undefined) {
				timeoutTimer = setTimeout(() => {
					timedOut = true;
					child.kill('SIGTERM');
				}, timeoutMs);
			}

			child.on('error', (error) => {
				if (settled) return;
				settled = true;
				clearTimeout(yieldTimer);
				if (timeoutTimer) clearTimeout(timeoutTimer);
				reject(error);
			});
			child.on('close', (exitCode, signal) => {
				if (timeoutTimer) clearTimeout(timeoutTimer);
				if (settled) return;
				settled = true;
				clearTimeout(yieldTimer);
				this.context.setPath(cwd);
				resolve({
					command,
					workdir: cwd,
					background: false,
					pty,
					pid: child.pid,
					exitCode,
					signal,
					stdout,
					stderr,
					durationMs: Date.now() - startedAt,
					timedOut: timedOut || undefined,
					stdoutTruncated: stdoutTruncated || undefined,
					stderrTruncated: stderrTruncated || undefined,
				});
			});
		});
	}
}
