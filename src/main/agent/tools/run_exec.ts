import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { agentLocation } from '../../shared/agent_location';
import { resolveUserPath } from '../../shared/user_path';
import { tool } from './tool';
import { registry } from './run_process';
import { execRequiresHardApproval } from './run_exec_requires_hard_approval';

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

const execInputSchema = z.object({
	command: z.string().min(1).describe('Shell command to execute'),
	workdir: z
		.string()
		.min(1)
		.optional()
		.describe(
			'Working directory. Relative paths resolve from the workspace; ~ expands to the user home.'
		),
	env: z.record(z.string(), z.string()).optional(),
	yieldMs: z
		.number()
		.min(0)
		.optional()
		.describe('Milliseconds to wait before backgrounding (default 10000)'),
	background: z.boolean().optional().describe('Run in background immediately'),
	timeout: z
		.number()
		.positive()
		.optional()
		.describe('Timeout in seconds (optional, kills process on expiry)'),
	pty: z
		.boolean()
		.optional()
		.describe('Run in a pseudo-terminal (PTY) when available (TTY-required CLIs, coding agents)'),
	elevated: z
		.boolean()
		.optional()
		.describe('Run on the host with elevated permissions (if allowed)'),
	host: z
		.enum(['auto', 'sandbox', 'gateway', 'node'])
		.optional()
		.describe('Exec host/target (auto|sandbox|gateway|node).'),
	security: z
		.string()
		.optional()
		.describe(
			'Ignored for normal calls; exec security is set by tools.exec.security and host approvals.'
		),
	ask: z
		.string()
		.optional()
		.describe(
			'Baseline ask comes from tools.exec.ask and host approvals; channel-origin calls ignore per-call ask when effective host ask is off.'
		),
	node: z.string().optional().describe('Node id/name for host=node.'),
});

async function runExec(
	input: z.infer<typeof execInputSchema>,
	abortSignal?: AbortSignal
): Promise<ExecResult> {
	abortSignal?.throwIfAborted();
	const {
		command,
		workdir,
		env: envInput,
		yieldMs: yieldMsInput,
		background: backgroundInput,
		timeout: timeoutInput,
		pty: ptyInput,
		elevated: elevatedInput,
		host: hostInput,
	} = input;

	if (elevatedInput === true) {
		throw new Error('exec elevated mode is not available in this runtime.');
	}
	if (hostInput === 'gateway' || hostInput === 'node') {
		throw new Error(`exec host '${hostInput}' is not available in this runtime.`);
	}

	const env: NodeJS.ProcessEnv = { ...process.env };
	if (envInput) {
		for (const [key, value] of Object.entries(envInput)) {
			env[key] = value;
		}
	}

	const cwd = resolveUserPath(workdir ?? '.', agentLocation());
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
			let settled = false;
			const cleanup = (): void => {
				if (timeoutTimer) clearTimeout(timeoutTimer);
				abortSignal?.removeEventListener('abort', abort);
			};
			const abort = (): void => {
				child.kill('SIGTERM');
				if (settled) return;
				settled = true;
				cleanup();
				reject(abortSignal?.reason ?? new Error('Exec cancelled.'));
			};
			abortSignal?.addEventListener('abort', abort, { once: true });
			if (abortSignal?.aborted) abort();
			child.once('error', (error) => {
				if (settled) return;
				settled = true;
				cleanup();
				reject(error);
			});
			child.once('exit', () => {
				cleanup();
			});
			child.once('spawn', () => {
				if (settled || abortSignal?.aborted) return;
				settled = true;
				cleanup();
				child.unref();
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
		let aborted = false;
		let timeoutTimer: NodeJS.Timeout | undefined;
		const yieldTimer = setTimeout(() => {
			if (settled || aborted) return;
			settled = true;
			abortSignal?.removeEventListener('abort', abort);

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
		const abort = (): void => {
			aborted = true;
			child.kill('SIGTERM');
		};
		abortSignal?.addEventListener('abort', abort, { once: true });
		if (abortSignal?.aborted) abort();

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
			abortSignal?.removeEventListener('abort', abort);
			reject(error);
		});
		child.on('close', (exitCode, signal) => {
			if (timeoutTimer) clearTimeout(timeoutTimer);
			abortSignal?.removeEventListener('abort', abort);
			if (settled) return;
			settled = true;
			clearTimeout(yieldTimer);
			if (aborted) {
				reject(abortSignal?.reason ?? new Error('Exec cancelled.'));
				return;
			}
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

export const execTool = tool({
	name: 'exec',
	risk: 'high',
	effect: 'execute',
	allowedOrigins: ['main', 'task', 'subagent'],
	hardApproval: ({ command }) => execRequiresHardApproval(command),
	description:
		'Run a shell command from the workspace or a chosen working directory. ' +
		'Use it for builds, tests, searches, and other command-line checks; set background or yieldMs for long-running commands, timeout to stop slow commands, and pty for TTY-only CLIs.',
	inputSchema: execInputSchema,
	execute: runExec,
});
