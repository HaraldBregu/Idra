import type {
	AgentHarnessOperationLogEntry,
	AgentHarnessOperationLogger,
	AgentHarnessPersistence,
	AgentHarnessSession,
	AgentHarnessSnapshot,
} from './types';

export class InMemoryAgentHarnessPersistence implements AgentHarnessPersistence {
	private readonly sessions = new Map<string, AgentHarnessSession>();
	private readonly snapshots = new Map<string, AgentHarnessSnapshot>();

	async loadSession(id: string): Promise<AgentHarnessSession | null> {
		const session = this.sessions.get(id);
		return session ? this.cloneSession(session) : null;
	}

	async saveSession(session: AgentHarnessSession): Promise<void> {
		this.sessions.set(session.id, this.cloneSession(session));
	}

	async listSessions(): Promise<AgentHarnessSession[]> {
		return [...this.sessions.values()].map((session) => this.cloneSession(session));
	}

	async deleteSession(id: string): Promise<void> {
		this.sessions.delete(id);
	}

	async saveSnapshot(snapshot: AgentHarnessSnapshot): Promise<void> {
		this.snapshots.set(snapshot.id, {
			...snapshot,
			session: this.cloneSession(snapshot.session),
		});
	}

	async loadSnapshot(id: string): Promise<AgentHarnessSnapshot | null> {
		const snapshot = this.snapshots.get(id);
		return snapshot
			? {
					...snapshot,
					session: this.cloneSession(snapshot.session),
				}
			: null;
	}

	private cloneSession(session: AgentHarnessSession): AgentHarnessSession {
		return {
			...session,
			metadata: session.metadata ? { ...session.metadata } : undefined,
			transcript: session.transcript.map((entry) => {
				if (entry.role === 'user') return { ...entry };
				if (entry.role === 'assistant') {
					return {
						...entry,
						content: entry.content.map((block) => ({ ...block })),
					};
				}
				return {
					...entry,
					content: entry.content.map((block) => ({ ...block })),
				};
			}),
			plan: session.plan.map((entry) => ({ ...entry })),
			compactionMarkers: session.compactionMarkers.map((marker) => ({ ...marker })),
		};
	}
}

export class InMemoryAgentHarnessOperationLogger implements AgentHarnessOperationLogger {
	private readonly entries: AgentHarnessOperationLogEntry[] = [];

	async append(entry: AgentHarnessOperationLogEntry): Promise<void> {
		this.entries.push({
			...entry,
			data: entry.data ? { ...entry.data } : undefined,
		});
	}

	readAll(): AgentHarnessOperationLogEntry[] {
		return this.entries.map((entry) => ({
			...entry,
			data: entry.data ? { ...entry.data } : undefined,
		}));
	}
}
