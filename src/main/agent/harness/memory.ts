import type {
	AgentHarnessMemory,
	AgentHarnessMemoryRecord,
	AgentHarnessRunResult,
	AgentHarnessSession,
} from './types';

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
