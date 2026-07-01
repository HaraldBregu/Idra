import type { ChildProcess } from 'node:child_process';
import { BaseTool, Context } from '../../types';

const MAX_BUFFER = 500_000;

export interface ProcessSession {
	readonly id: string;
	readonly pid: number | undefined;
	readonly command: string;
	readonly workdir: string;
	readonly startedAt: number;
	stdout: string;
	stderr: string;
	exitCode: number | null | undefined;
	exitSignal: string | null | undefined;
	exited: boolean;
	timedOut?: boolean;
	readonly child: ChildProcess;
}

class SessionRegistry {
	private readonly sessions = new Map<string, ProcessSession>();

	register(session: ProcessSession): ProcessSession {
		this.sessions.set(session.id, session);
		return session;
	}

	get(id: string): ProcessSession | undefined {
		return this.sessions.get(id);
	}

	list(): ProcessSession[] {
		return [...this.sessions.values()];
	}

	remove(id: string): boolean {
		return this.sessions.delete(id);
	}

	append(session: ProcessSession, stream: 'stdout' | 'stderr', chunk: string): void {
		if (stream === 'stdout') {
			session.stdout = (session.stdout + chunk).slice(-MAX_BUFFER);
		} else {
			session.stderr = (session.stderr + chunk).slice(-MAX_BUFFER);
		}
	}
}

export const registry = new SessionRegistry();

const SPECIAL_KEYS: Record<string, string> = {
	Enter: '\r',
	Return: '\r',
	Tab: '\t',
	Escape: '\x1b',
	Backspace: '\x7f',
	'Ctrl+C': '\x03',
	'Ctrl+D': '\x04',
	'Ctrl+Z': '\x1a',
	'Ctrl+L': '\x0c',
	Up: '\x1b[A',
	Down: '\x1b[B',
	Right: '\x1b[C',
	Left: '\x1b[D',
};

function sessionSummary(s: ProcessSession) {
	return {
		sessionId: s.id,
		pid: s.pid,
		command: s.command,
		workdir: s.workdir,
		startedAt: s.startedAt,
		exited: s.exited,
		exitCode: s.exitCode,
		exitSignal: s.exitSignal,
		timedOut: s.timedOut,
		stdoutLength: s.stdout.length,
		stderrLength: s.stderr.length,
	};
}

function paginateLines(text: string, offset: number, lines: number): { content: string; nextOffset: number; hasMore: boolean } {
	const all = text.split('\n');
	const slice = all.slice(offset, offset + lines);
	return {
		content: slice.join('\n'),
		nextOffset: offset + slice.length,
		hasMore: offset + slice.length < all.length,
	};
}

function sleep(ms: number): Promise<void> {
	return new Promise((res) => setTimeout(res, ms));
}

async function pollUntil(session: ProcessSession, timeoutMs: number): Promise<void> {
	const before = session.stdout.length + session.stderr.length;
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (session.exited) return;
		if (session.stdout.length + session.stderr.length !== before) return;
		await sleep(50);
	}
}

export class ProcessTool extends BaseTool {
	readonly name = 'process';
	readonly label = 'Process';
	readonly description =
		'Manage running exec sessions for commands already started: list, poll, log, write, send-keys, submit, paste, kill. ' +
		'Use poll/log when you need status, logs, quiet-success confirmation, or completion confirmation. ' +
		'Use write/send-keys/submit/paste/kill for input or intervention.';
	readonly schema = {
		type: 'object',
		required: ['action'],
		additionalProperties: false,
		properties: {
			action: {
				type: 'string',
				enum: ['list', 'poll', 'log', 'write', 'send-keys', 'submit', 'paste', 'kill', 'clear', 'remove'],
				description: 'list|poll|log|write|send-keys|submit|paste|kill|clear|remove',
			},
			sessionId: {
				type: 'string',
				description: 'Target session (required for all except list).',
			},
			timeout: {
				type: 'number',
				description: 'poll: wait up to N ms for new output or exit (max 30000).',
			},
			offset: {
				type: 'number',
				description: 'log: start from this line number (0-based, for pagination).',
			},
			lines: {
				type: 'number',
				description: 'log: number of lines to return (default 200).',
			},
			text: {
				type: 'string',
				description: 'write/paste: text to send to stdin.',
			},
			bytes: {
				type: 'string',
				description: 'send-keys: named key or escape sequence (e.g. "Ctrl+C", "Enter", "\\x03").',
			},
			literal: {
				type: 'string',
				description: 'send-keys: literal string to write verbatim to stdin.',
			},
			signal: {
				type: 'string',
				description: 'kill: signal name (default SIGTERM).',
			},
		},
	};

	constructor(context: Context) {
		super(context);
	}

	async run(input: Record<string, unknown>): Promise<unknown> {
		const action = input.action;
		if (typeof action !== 'string') throw new Error('process: action is required.');

		if (action === 'list') {
			return registry.list().map(sessionSummary);
		}

		const sessionId = input.sessionId;
		if (typeof sessionId !== 'string') throw new Error('process: sessionId is required.');
		const session = registry.get(sessionId);
		if (!session) throw new Error(`process: session '${sessionId}' not found.`);

		switch (action) {
			case 'poll': {
				const timeoutMs = Math.min(
					typeof input.timeout === 'number' ? input.timeout : 5000,
					30000
				);
				await pollUntil(session, timeoutMs);
				return {
					...sessionSummary(session),
					stdout: session.stdout,
					stderr: session.stderr,
				};
			}

			case 'log': {
				const offset = typeof input.offset === 'number' ? Math.max(0, input.offset) : 0;
				const lines = typeof input.lines === 'number' ? Math.max(1, input.lines) : 200;
				const stdoutPage = paginateLines(session.stdout, offset, lines);
				const stderrPage = paginateLines(session.stderr, offset, lines);
				return {
					...sessionSummary(session),
					stdout: stdoutPage,
					stderr: stderrPage,
				};
			}

			case 'write': {
				const text = input.text;
				if (typeof text !== 'string') throw new Error('process write: text is required.');
				if (!session.child.stdin) throw new Error('process write: session stdin is not available.');
				session.child.stdin.write(text);
				return { sessionId, written: text.length };
			}

			case 'send-keys': {
				if (!session.child.stdin) throw new Error('process send-keys: session stdin is not available.');
				const bytes = input.bytes;
				const literal = input.literal;
				if (typeof bytes === 'string') {
					const resolved = SPECIAL_KEYS[bytes] ?? bytes.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) =>
						String.fromCharCode(parseInt(h, 16))
					);
					session.child.stdin.write(resolved);
					return { sessionId, sent: bytes };
				}
				if (typeof literal === 'string') {
					session.child.stdin.write(literal);
					return { sessionId, sent: literal };
				}
				throw new Error('process send-keys: bytes or literal is required.');
			}

			case 'submit': {
				if (!session.child.stdin) throw new Error('process submit: session stdin is not available.');
				session.child.stdin.write('\n');
				return { sessionId, submitted: true };
			}

			case 'paste': {
				const text = input.text;
				if (typeof text !== 'string') throw new Error('process paste: text is required.');
				if (!session.child.stdin) throw new Error('process paste: session stdin is not available.');
				session.child.stdin.write(text);
				return { sessionId, pasted: text.length };
			}

			case 'kill': {
				const sig = (typeof input.signal === 'string' ? input.signal : 'SIGTERM') as NodeJS.Signals;
				session.child.kill(sig);
				return { sessionId, killed: true, signal: sig };
			}

			case 'clear': {
				session.stdout = '';
				session.stderr = '';
				return { sessionId, cleared: true };
			}

			case 'remove': {
				if (!session.exited) session.child.kill('SIGTERM');
				registry.remove(sessionId);
				return { sessionId, removed: true };
			}

			default:
				throw new Error(`process: unknown action '${action}'.`);
		}
	}
}
