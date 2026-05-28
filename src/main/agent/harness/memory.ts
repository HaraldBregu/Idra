import type { AgentHarnessMemory, AgentHarnessMemoryRecord, AgentHarnessOperationLogEntry, AgentHarnessOperationLogger, AgentHarnessPersistence, AgentHarnessRunResult, AgentHarnessSession, AgentHarnessSnapshot } from './types';

export class InMemoryAgentHarnessPersistence implements AgentHarnessPersistence {
	private readonly sessions = new Map<string, AgentHarnessSession>();
	private readonly snapshots = new Map<string, AgentHarnessSnapshot>();
	async loadSession(id: string): Promise<AgentHarnessSession | null> { return this.sessions.get(id) ?? null; }
	async saveSession(session: AgentHarnessSession): Promise<void> { this.sessions.set(session.id, structuredClone(session)); }
	async listSessions(): Promise<AgentHarnessSession[]> { return [...this.sessions.values()].map((session) => structuredClone(session)); }
	async deleteSession(id: string): Promise<void> { this.sessions.delete(id); }
	async saveSnapshot(snapshot: AgentHarnessSnapshot): Promise<void> { this.snapshots.set(snapshot.id, structuredClone(snapshot)); }
	async loadSnapshot(id: string): Promise<AgentHarnessSnapshot | null> { return this.snapshots.get(id) ?? null; }
}

export class InMemoryAgentHarnessOperationLogger implements AgentHarnessOperationLogger {
	private readonly entries: AgentHarnessOperationLogEntry[] = [];
	async append(entry: AgentHarnessOperationLogEntry): Promise<void> { this.entries.push(structuredClone(entry)); }
	readAll(): AgentHarnessOperationLogEntry[] { return this.entries.map((entry) => structuredClone(entry)); }
}

export class InMemoryAgentHarnessMemory implements AgentHarnessMemory {
	constructor(private readonly records: AgentHarnessMemoryRecord[] = []) {}
	async retrieve(): Promise<AgentHarnessMemoryRecord[]> { return this.records.map((record) => ({ ...record })); }
	async store(input: { session: AgentHarnessSession; result: AgentHarnessRunResult }): Promise<void> {
		if (input.result.finalText.trim()) {
			this.records.push({ id: `${input.session.id}:${input.result.runId}`, text: input.result.finalText, createdAt: new Date().toISOString() });
		}
	}
}
