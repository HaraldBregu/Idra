import type { SubagentOutcome, SubagentRunRecord } from './types';

const TERMINAL_OUTCOMES = new Set<SubagentOutcome>(['ok', 'error', 'timeout', 'cancelled']);

function clone(record: SubagentRunRecord): SubagentRunRecord {
	return JSON.parse(JSON.stringify(record)) as SubagentRunRecord;
}

export class SubagentRegistry {
	private readonly runs = new Map<string, SubagentRunRecord>();

	registerSubagentRun(record: SubagentRunRecord): SubagentRunRecord {
		if (this.runs.has(record.runId))
			throw new Error(`Subagent run already exists: ${record.runId}`);
		this.runs.set(record.runId, clone(record));
		return clone(record);
	}

	listSubagentRunsForRequester(requesterSessionKey: string): SubagentRunRecord[] {
		return [...this.runs.values()]
			.filter((record) => record.requesterSessionKey === requesterSessionKey)
			.map(clone);
	}

	countActiveRunsForSession(requesterSessionKey: string): number {
		return this.listSubagentRunsForRequester(requesterSessionKey).filter((record) =>
			this.isActive(record)
		).length;
	}

	startSubagentRun(runId: string, startedAt = Date.now()): SubagentRunRecord {
		const record = this.require(runId);
		if (record.startedAt === undefined) record.startedAt = startedAt;
		this.runs.set(runId, record);
		return clone(record);
	}

	completeSubagentRun(
		runId: string,
		outcome: SubagentOutcome,
		options: { endedAt?: number; error?: string } = {}
	): SubagentRunRecord {
		const record = this.require(runId);
		record.outcome = outcome;
		record.endedAt = options.endedAt ?? Date.now();
		if (options.error) record.error = options.error;
		this.runs.set(runId, record);
		return clone(record);
	}

	cancelSubagentRun(runId: string, error = 'Cancelled'): SubagentRunRecord {
		return this.completeSubagentRun(runId, 'cancelled', { error });
	}

	getSubagentRun(runId: string): SubagentRunRecord | undefined {
		const record = this.runs.get(runId);
		return record ? clone(record) : undefined;
	}

	getSubagentRunByChildSessionKey(childSessionKey: string): SubagentRunRecord | undefined {
		const record = [...this.runs.values()].find((run) => run.childSessionKey === childSessionKey);
		return record ? clone(record) : undefined;
	}

	restoreSubagentRuns(records: SubagentRunRecord[]): void {
		this.runs.clear();
		for (const record of records) this.runs.set(record.runId, clone(record));
	}

	private require(runId: string): SubagentRunRecord {
		const record = this.runs.get(runId);
		if (!record) throw new Error(`Subagent run not found: ${runId}`);
		return clone(record);
	}

	private isActive(record: SubagentRunRecord): boolean {
		return !record.outcome || !TERMINAL_OUTCOMES.has(record.outcome);
	}
}
