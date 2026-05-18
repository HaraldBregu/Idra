import type {
	OpenClawCronJobDefinition,
	OpenClawCronJobState,
	OpenClawCronRunRecord,
} from '../../../shared/cron';
import {
	assertSafeCronId,
	openClawScheduleIdentity,
} from './validation';

const SCHEMA_VERSION = 1;

export interface OpenClawCronSnapshot {
	jobs: OpenClawCronJobDefinition[];
	states: Record<string, OpenClawCronJobState>;
}

export interface OpenClawCronStoreState extends OpenClawCronSnapshot {
	schemaVersion: number;
	runs: Record<string, OpenClawCronRunRecord[]>;
}

export interface OpenClawCronStore {
	load(): Promise<OpenClawCronSnapshot>;
	save(snapshot: OpenClawCronSnapshot): Promise<void>;
	appendRun(record: OpenClawCronRunRecord): Promise<void>;
	listRuns(jobId: string, limit?: number): Promise<OpenClawCronRunRecord[]>;
}

interface OpenClawCronSettingsStore {
	getOpenClawCronState(): OpenClawCronStoreState;
	setOpenClawCronState(state: OpenClawCronStoreState): void;
}

function clone<T>(value: T): T {
	return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function defaultState(job: OpenClawCronJobDefinition): OpenClawCronJobState {
	return {
		consecutiveErrors: 0,
		consecutiveSkipped: 0,
		consecutiveScheduleErrors: 0,
		attempts: 0,
		scheduleIdentity: openClawScheduleIdentity(job.schedule),
	};
}

function normalizeState(
	job: OpenClawCronJobDefinition,
	state: Partial<OpenClawCronJobState> | undefined
): OpenClawCronJobState {
	const next: OpenClawCronJobState = {
		...defaultState(job),
		...(state ?? {}),
	};
	const identity = openClawScheduleIdentity(job.schedule);
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

function normalizeJobs(value: unknown): OpenClawCronJobDefinition[] {
	if (!Array.isArray(value)) return [];
	const jobs: OpenClawCronJobDefinition[] = [];
	for (const entry of value) {
		if (!isRecord(entry) || typeof entry.id !== 'string') continue;
		try {
			assertSafeCronId(entry.id);
			jobs.push(clone(entry as unknown as OpenClawCronJobDefinition));
		} catch {
			continue;
		}
	}
	return jobs;
}

function isRunRecord(value: unknown, jobId: string): value is OpenClawCronRunRecord {
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

function normalizeRuns(value: unknown): Record<string, OpenClawCronRunRecord[]> {
	if (!isRecord(value)) return {};
	const runs: Record<string, OpenClawCronRunRecord[]> = {};
	for (const [jobId, entries] of Object.entries(value)) {
		try {
			assertSafeCronId(jobId, 'jobId');
		} catch {
			continue;
		}
		if (!Array.isArray(entries)) continue;
		const records = entries.filter((entry): entry is OpenClawCronRunRecord => isRunRecord(entry, jobId));
		if (records.length > 0) runs[jobId] = clone(records);
	}
	return runs;
}

export function emptyOpenClawCronStoreState(): OpenClawCronStoreState {
	return {
		schemaVersion: SCHEMA_VERSION,
		jobs: [],
		states: {},
		runs: {},
	};
}

export function migrateOpenClawCronStoreState(value: unknown): OpenClawCronStoreState {
	const source = isRecord(value) ? value : {};
	const jobs = normalizeJobs(source.jobs);
	const stateSource = isRecord(source.states) ? source.states : {};
	const states: Record<string, OpenClawCronJobState> = {};
	for (const job of jobs) {
		const current = stateSource[job.id];
		states[job.id] = normalizeState(
			job,
			isRecord(current) ? current as Partial<OpenClawCronJobState> : undefined
		);
	}
	return {
		schemaVersion: SCHEMA_VERSION,
		jobs,
		states,
		runs: normalizeRuns(source.runs),
	};
}

export class ElectronStoreOpenClawCronStore implements OpenClawCronStore {
	constructor(private readonly store: OpenClawCronSettingsStore) {}

	async load(): Promise<OpenClawCronSnapshot> {
		const state = this.read();
		return {
			jobs: clone(state.jobs),
			states: clone(state.states),
		};
	}

	async save(snapshot: OpenClawCronSnapshot): Promise<void> {
		const state = this.read();
		const jobs = clone(snapshot.jobs);
		const states: Record<string, OpenClawCronJobState> = {};
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

	async appendRun(record: OpenClawCronRunRecord): Promise<void> {
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

	async listRuns(jobId: string, limit = 50): Promise<OpenClawCronRunRecord[]> {
		assertSafeCronId(jobId, 'jobId');
		const runs = this.read().runs[jobId] ?? [];
		return clone(runs.slice(Math.max(0, runs.length - Math.max(1, limit))));
	}

	private read(): OpenClawCronStoreState {
		return migrateOpenClawCronStoreState(this.store.getOpenClawCronState());
	}

	private write(state: OpenClawCronStoreState): void {
		this.store.setOpenClawCronState(migrateOpenClawCronStoreState(state));
	}
}

export { defaultState as defaultOpenClawCronJobState };
