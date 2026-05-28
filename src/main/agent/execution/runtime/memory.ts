import type { AgentRuntimeMemory, AgentRuntimeMemoryRecord, AgentRuntimeOperationLogEntry, AgentRuntimeOperationLogger, AgentRuntimePersistence, AgentRuntimeRunResult, AgentRuntimeSession, AgentRuntimeSnapshot } from './types';

export class InMemoryAgentRuntimePersistence implements AgentRuntimePersistence {
	private readonly sessions = new Map<string, AgentRuntimeSession>();
	private readonly snapshots = new Map<string, AgentRuntimeSnapshot>();
	async loadSession(id: string): Promise<AgentRuntimeSession | null> { return this.sessions.get(id) ?? null; }
	async saveSession(session: AgentRuntimeSession): Promise<void> { this.sessions.set(session.id, structuredClone(session)); }
	async listSessions(): Promise<AgentRuntimeSession[]> { return [...this.sessions.values()].map((session) => structuredClone(session)); }
	async deleteSession(id: string): Promise<void> { this.sessions.delete(id); }
	async saveSnapshot(snapshot: AgentRuntimeSnapshot): Promise<void> { this.snapshots.set(snapshot.id, structuredClone(snapshot)); }
	async loadSnapshot(id: string): Promise<AgentRuntimeSnapshot | null> { return this.snapshots.get(id) ?? null; }
}

export class InMemoryAgentRuntimeOperationLogger implements AgentRuntimeOperationLogger {
	private readonly entries: AgentRuntimeOperationLogEntry[] = [];
	async append(entry: AgentRuntimeOperationLogEntry): Promise<void> { this.entries.push(structuredClone(entry)); }
	readAll(): AgentRuntimeOperationLogEntry[] { return this.entries.map((entry) => structuredClone(entry)); }
}

export class InMemoryAgentRuntimeMemory implements AgentRuntimeMemory {
	constructor(private readonly records: AgentRuntimeMemoryRecord[] = []) {}
	async retrieve(): Promise<AgentRuntimeMemoryRecord[]> { return this.records.map((record) => ({ ...record })); }
	async store(input: { session: AgentRuntimeSession; result: AgentRuntimeRunResult }): Promise<void> {
		if (input.result.finalText.trim()) {
			this.records.push({ id: `${input.session.id}:${input.result.runId}`, text: input.result.finalText, createdAt: new Date().toISOString() });
		}
	}
}
