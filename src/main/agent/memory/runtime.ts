export interface AgentMemoryRecord {
	id: string;
	text: string;
	createdAt: string;
}

export class AgentMemoryRuntime {
	private readonly records = new Map<string, AgentMemoryRecord>();
	list(): AgentMemoryRecord[] {
		return [...this.records.values()];
	}
	remember(record: AgentMemoryRecord): void {
		this.records.set(record.id, record);
	}
}
