import type { SubagentOutcome, SubagentRunRecord } from './types';

export class SubagentRegistry {
	private readonly runs = new Map<string, SubagentRunRecord>();
	registerSubagentRun(record: SubagentRunRecord): SubagentRunRecord {
		this.runs.set(record.runId, { ...record });
		return { ...record };
	}
	listSubagentRunsForRequester(requesterSessionKey: string): SubagentRunRecord[] {
		return [...this.runs.values()].filter((run) => run.requesterSessionKey === requesterSessionKey).map((run) => ({ ...run }));
	}
	startSubagentRun(runId: string, startedAt = Date.now()): SubagentRunRecord {
		this.require(runId);
		return this.update(runId, { status: 'running', startedAt });
	}
	completeSubagentRun(runId: string, outcome: SubagentOutcome, patch: Partial<SubagentRunRecord> = {}): SubagentRunRecord {
		return this.update(runId, { ...patch, status: 'completed', outcome, completedAt: Date.now() });
	}
	cancelSubagentRun(runId: string, error = 'Cancelled'): SubagentRunRecord {
		return this.completeSubagentRun(runId, 'cancelled', { error });
	}
	getSubagentRun(runId: string): SubagentRunRecord | undefined { const run = this.runs.get(runId); return run ? { ...run } : undefined; }
	getSubagentRunByChildSessionKey(childSessionKey: string): SubagentRunRecord | undefined { return [...this.runs.values()].find((run) => run.childSessionKey === childSessionKey); }
	restoreSubagentRuns(records: SubagentRunRecord[]): void { records.forEach((record) => this.runs.set(record.runId, { ...record })); }
	private require(runId: string): SubagentRunRecord { const run = this.runs.get(runId); if (!run) throw new Error(`Subagent run not found: ${runId}`); return run; }
	private update(runId: string, patch: Partial<SubagentRunRecord>): SubagentRunRecord { const next = { ...this.require(runId), ...patch }; this.runs.set(runId, next); return { ...next }; }
}
