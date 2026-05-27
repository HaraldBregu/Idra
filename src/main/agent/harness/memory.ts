import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
	AgentHarnessMemory,
	AgentHarnessMemoryRecord,
	AgentHarnessOperationLogEntry,
	AgentHarnessOperationLogger,
	AgentHarnessPersistence,
	AgentHarnessRunResult,
	AgentHarnessSession,
	AgentHarnessSnapshot,
} from './types';
import { redactHarnessSecrets } from './config';

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

export class FileAgentHarnessPersistence implements AgentHarnessPersistence {
	constructor(private readonly baseDir: string) {}

	async loadSession(id: string): Promise<AgentHarnessSession | null> {
		return this.readJson<AgentHarnessSession>(this.sessionPath(id));
	}

	async saveSession(session: AgentHarnessSession): Promise<void> {
		await this.writeJson(this.sessionPath(session.id), redactHarnessSecrets(session));
	}

	async listSessions(): Promise<AgentHarnessSession[]> {
		const dir = path.join(this.baseDir, 'sessions');
		const entries = await fs.readdir(dir).catch(() => []);
		const sessions = await Promise.all(
			entries
				.filter((entry) => entry.endsWith('.json'))
				.map((entry) => this.readJson<AgentHarnessSession>(path.join(dir, entry)))
		);
		return sessions.flatMap((session) => session ? [session] : []);
	}

	async deleteSession(id: string): Promise<void> {
		await fs.rm(this.sessionPath(id), { force: true });
	}

	async saveSnapshot(snapshot: AgentHarnessSnapshot): Promise<void> {
		await this.writeJson(this.snapshotPath(snapshot.id), redactHarnessSecrets(snapshot));
	}

	async loadSnapshot(id: string): Promise<AgentHarnessSnapshot | null> {
		return this.readJson<AgentHarnessSnapshot>(this.snapshotPath(id));
	}

	private sessionPath(id: string): string {
		return path.join(this.baseDir, 'sessions', `${safeFileName(id)}.json`);
	}

	private snapshotPath(id: string): string {
		return path.join(this.baseDir, 'snapshots', `${safeFileName(id)}.json`);
	}

	private async readJson<T>(file: string): Promise<T | null> {
		try {
			return JSON.parse(await fs.readFile(file, 'utf8')) as T;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw error;
		}
	}

	private async writeJson(file: string, value: unknown): Promise<void> {
		await fs.mkdir(path.dirname(file), { recursive: true });
		await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
	}
}

export class InMemoryAgentHarnessMemory implements AgentHarnessMemory {
	private readonly records = new Map<string, AgentHarnessMemoryRecord>();

	constructor(records: AgentHarnessMemoryRecord[] = []) {
		for (const record of records) {
			this.records.set(record.id, { ...record });
		}
	}

	async retrieve(input: { task: string; session: AgentHarnessSession }): Promise<AgentHarnessMemoryRecord[]> {
		const query = tokenize(input.task);
		return [...this.records.values()]
			.filter((record) => !record.scope || record.scope === input.session.id || record.scope === input.session.parentSessionId)
			.map((record) => ({ record, score: scoreRecord(record, query) }))
			.filter((entry) => entry.score > 0 || query.length === 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 12)
			.map((entry) => ({ ...entry.record }));
	}

	async store(input: { session: AgentHarnessSession; result: AgentHarnessRunResult }): Promise<void> {
		const text = input.result.finalText.trim();
		if (!text) return;
		const now = new Date().toISOString();
		const id = `${input.session.id}:${input.result.runId}`;
		this.records.set(id, {
			id,
			scope: input.session.id,
			text: text.slice(0, 2_000),
			createdAt: now,
			updatedAt: now,
		});
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

function safeFileName(value: string): string {
	return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function tokenize(value: string): string[] {
	return value
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((token) => token.length > 2);
}

function scoreRecord(record: AgentHarnessMemoryRecord, query: string[]): number {
	const text = new Set(tokenize(record.text));
	return query.reduce((score, token) => score + (text.has(token) ? 1 : 0), 0);
}
