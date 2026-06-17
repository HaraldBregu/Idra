import type { ChildProcess } from 'node:child_process';

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
