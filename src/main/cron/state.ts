import type {
	CronJobDefinition,
	CronJobState,
	CronJobRunRecord,
} from '../../shared/app/cron';
import { assertSafeCronId, cronJobScheduleIdentity } from './validate';
import { CRON_JOB_STORE_SCHEMA_VERSION } from './constants';

export interface CronJobSnapshot {
	jobs: CronJobDefinition[];
	states: Record<string, CronJobState>;
}

export interface CronJobStoreState extends CronJobSnapshot {
	schemaVersion: number;
	runs: Record<string, CronJobRunRecord[]>;
}

export interface CronJobStore {
	load(): Promise<CronJobSnapshot>;
	save(snapshot: CronJobSnapshot): Promise<void>;
	appendRun(record: CronJobRunRecord): Promise<void>;
	listRuns(jobId: string, limit?: number): Promise<CronJobRunRecord[]>;
}

interface CronJobSettingsStore {
	getCronJobState(): CronJobStoreState;
	setCronJobState(state: CronJobStoreState): void;
}

function clone<T>(value: T): T {
	return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function defaultState(job: CronJobDefinition): CronJobState {
	return {
		consecutiveErrors: 0,
		consecutiveSkipped: 0,
		consecutiveScheduleErrors: 0,
		attempts: 0,
		scheduleIdentity: cronJobScheduleIdentity(job.schedule),
	};
}

function normalizeState(
	job: CronJobDefinition,
	state: Partial<CronJobState> | undefined
): CronJobState {
	const next: CronJobState = {
		...defaultState(job),
		...(state ?? {}),
	};
	const identity = cronJobScheduleIdentity(job.schedule);
	if (next.scheduleIdentity && next.scheduleIdentity !== identity) {
		next.nextRunAtMs = undefined;
		next.runningAtMs = undefined;
	}
	next.scheduleIdentity = identity;
	next.consecutiveErrors ??= 0;
	next.consecutiveSkipped ??= 0;
	next.consecutiveScheduleErrors ??= 0;
	next.attempts ??= 0;
	return next;
}

function normalizeJobs(value: unknown): CronJobDefinition[] {
	if (!Array.isArray(value)) return [];
	const jobs: CronJobDefinition[] = [];
	for (const entry of value) {
		if (!isRecord(entry) || typeof entry.id !== 'string') continue;
		try {
			assertSafeCronId(entry.id);
			const job = clone(entry as unknown as CronJobDefinition);
			if (job.payload?.kind === 'agentTurn') {
				delete (job.payload as Record<string, unknown>).providerId;
				delete (job.payload as Record<string, unknown>).model;
			}
			jobs.push(job);
		} catch {
			continue;
		}
	}
	return jobs;
}

function isRunRecord(value: unknown, jobId: string): value is CronJobRunRecord {
	return (
		isRecord(value) &&
		typeof value.runId === 'string' &&
		value.jobId === jobId &&
		(value.status === 'ok' || value.status === 'error' || value.status === 'skipped') &&
		typeof value.scheduledForMs === 'number' &&
		typeof value.startedAtMs === 'number' &&
		typeof value.finishedAtMs === 'number' &&
		typeof value.attempt === 'number'
	);
}

function normalizeRuns(value: unknown): Record<string, CronJobRunRecord[]> {
	if (!isRecord(value)) return {};
	const runs: Record<string, CronJobRunRecord[]> = {};
	for (const [jobId, entries] of Object.entries(value)) {
		try {
			assertSafeCronId(jobId, 'jobId');
		} catch {
			continue;
		}
		if (!Array.isArray(entries)) continue;
		const records = entries.filter((entry): entry is CronJobRunRecord =>
			isRunRecord(entry, jobId)
		);
		if (records.length > 0) runs[jobId] = clone(records);
	}
	return runs;
}

export function emptyCronJobStoreState(): CronJobStoreState {
	return {
		schemaVersion: CRON_JOB_STORE_SCHEMA_VERSION,
		jobs: [],
		states: {},
		runs: {},
	};
}

export function migrateCronJobStoreState(value: unknown): CronJobStoreState {
	const source = isRecord(value) ? value : {};
	const jobs = normalizeJobs(source.jobs);
	const stateSource = isRecord(source.states) ? source.states : {};
	const states: Record<string, CronJobState> = {};
	for (const job of jobs) {
		const current = stateSource[job.id];
		states[job.id] = normalizeState(
			job,
			isRecord(current) ? (current as Partial<CronJobState>) : undefined
		);
	}
	return {
		schemaVersion: CRON_JOB_STORE_SCHEMA_VERSION,
		jobs,
		states,
		runs: normalizeRuns(source.runs),
	};
}

export class ElectronStoreCronJobStore implements CronJobStore {
	constructor(private readonly store: CronJobSettingsStore) {}

	async load(): Promise<CronJobSnapshot> {
		const state = this.read();
		return {
			jobs: clone(state.jobs),
			states: clone(state.states),
		};
	}

	async save(snapshot: CronJobSnapshot): Promise<void> {
		const state = this.read();
		const jobs = clone(snapshot.jobs);
		const states: Record<string, CronJobState> = {};
		for (const job of jobs) {
			assertSafeCronId(job.id);
			states[job.id] = normalizeState(job, snapshot.states[job.id]);
		}
		this.write({
			...state,
			jobs,
			states,
		});
	}

	async appendRun(record: CronJobRunRecord): Promise<void> {
		assertSafeCronId(record.jobId, 'jobId');
		const state = this.read();
		const runs = state.runs[record.jobId] ?? [];
		this.write({
			...state,
			runs: {
				...state.runs,
				[record.jobId]: [...runs, clone(record)],
			},
		});
	}

	async listRuns(jobId: string, limit = 50): Promise<CronJobRunRecord[]> {
		assertSafeCronId(jobId, 'jobId');
		const runs = this.read().runs[jobId] ?? [];
		return clone(runs.slice(Math.max(0, runs.length - Math.max(1, limit))));
	}

	private read(): CronJobStoreState {
		return migrateCronJobStoreState(this.store.getCronJobState());
	}

	private write(state: CronJobStoreState): void {
		this.store.setCronJobState(migrateCronJobStoreState(state));
	}
}

export { defaultState as defaultCronJobState };
