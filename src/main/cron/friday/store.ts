import type {
	FridayCronJobDefinition,
	FridayCronJobState,
	FridayCronRunRecord,
} from '../../../shared/cron';
import { assertSafeCronId, fridayScheduleIdentity } from './validation';

const SCHEMA_VERSION = 1;

export interface FridayCronSnapshot {
	jobs: FridayCronJobDefinition[];
	states: Record<string, FridayCronJobState>;
}

export interface FridayCronStoreState extends FridayCronSnapshot {
	schemaVersion: number;
	lastRuns: Record<string, FridayCronRunRecord>;
}

export interface FridayCronStore {
	load(): Promise<FridayCronSnapshot>;
	save(snapshot: FridayCronSnapshot): Promise<void>;
	appendRun(record: FridayCronRunRecord): Promise<void>;
	listRuns(jobId: string, limit?: number): Promise<FridayCronRunRecord[]>;
}

interface FridayCronSettingsStore {
	getFridayCronState(): FridayCronStoreState;
	setFridayCronState(state: FridayCronStoreState): void;
}

function clone<T>(value: T): T {
	return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function defaultState(job: FridayCronJobDefinition): FridayCronJobState {
	return {
		consecutiveErrors: 0,
		consecutiveSkipped: 0,
		consecutiveScheduleErrors: 0,
		attempts: 0,
		scheduleIdentity: fridayScheduleIdentity(job.schedule),
	};
}

function normalizeState(
	job: FridayCronJobDefinition,
	state: Partial<FridayCronJobState> | undefined
): FridayCronJobState {
	const next: FridayCronJobState = {
		...defaultState(job),
		...(state ?? {}),
	};
	const identity = fridayScheduleIdentity(job.schedule);
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

function normalizeJobs(value: unknown): FridayCronJobDefinition[] {
	if (!Array.isArray(value)) return [];
	const jobs: FridayCronJobDefinition[] = [];
	for (const entry of value) {
		if (!isRecord(entry) || typeof entry.id !== 'string') continue;
		try {
			assertSafeCronId(entry.id);
			const job = clone(entry as unknown as FridayCronJobDefinition);
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

function isRunRecord(value: unknown, jobId: string): value is FridayCronRunRecord {
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

function normalizeLastRuns(
	value: unknown,
	legacyRuns: unknown
): Record<string, FridayCronRunRecord> {
	const lastRuns: Record<string, FridayCronRunRecord> = {};
	if (isRecord(legacyRuns)) {
		for (const [jobId, entries] of Object.entries(legacyRuns)) {
			try {
				assertSafeCronId(jobId, 'jobId');
			} catch {
				continue;
			}
			if (!Array.isArray(entries)) continue;
			const records = entries.filter((entry): entry is FridayCronRunRecord =>
				isRunRecord(entry, jobId)
			);
			const lastRun = records.at(-1);
			if (lastRun) lastRuns[jobId] = clone(lastRun);
		}
	}
	if (!isRecord(value)) return lastRuns;
	for (const [jobId, entries] of Object.entries(value)) {
		try {
			assertSafeCronId(jobId, 'jobId');
		} catch {
			continue;
		}
		if (isRunRecord(entries, jobId)) lastRuns[jobId] = clone(entries);
	}
	return lastRuns;
}

export function emptyFridayCronStoreState(): FridayCronStoreState {
	return {
		schemaVersion: SCHEMA_VERSION,
		jobs: [],
		states: {},
		lastRuns: {},
	};
}

export function migrateFridayCronStoreState(value: unknown): FridayCronStoreState {
	const source = isRecord(value) ? value : {};
	const jobs = normalizeJobs(source.jobs);
	const stateSource = isRecord(source.states) ? source.states : {};
	const states: Record<string, FridayCronJobState> = {};
	for (const job of jobs) {
		const current = stateSource[job.id];
		states[job.id] = normalizeState(
			job,
			isRecord(current) ? (current as Partial<FridayCronJobState>) : undefined
		);
	}
	return {
		schemaVersion: SCHEMA_VERSION,
		jobs,
		states,
		lastRuns: normalizeLastRuns(source.lastRuns, source.runs),
	};
}

export class ElectronStoreFridayCronStore implements FridayCronStore {
	constructor(private readonly store: FridayCronSettingsStore) {}

	async load(): Promise<FridayCronSnapshot> {
		const state = this.read();
		return {
			jobs: clone(state.jobs),
			states: clone(state.states),
		};
	}

	async save(snapshot: FridayCronSnapshot): Promise<void> {
		const state = this.read();
		const jobs = clone(snapshot.jobs);
		const states: Record<string, FridayCronJobState> = {};
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

	async appendRun(record: FridayCronRunRecord): Promise<void> {
		assertSafeCronId(record.jobId, 'jobId');
		const state = this.read();
		this.write({
			...state,
			lastRuns: {
				...state.lastRuns,
				[record.jobId]: clone(record),
			},
		});
	}

	async listRuns(jobId: string, limit = 50): Promise<FridayCronRunRecord[]> {
		assertSafeCronId(jobId, 'jobId');
		const run = this.read().lastRuns[jobId];
		return run && limit !== 0 ? [clone(run)] : [];
	}

	private read(): FridayCronStoreState {
		return migrateFridayCronStoreState(this.store.getFridayCronState());
	}

	private write(state: FridayCronStoreState): void {
		this.store.setFridayCronState(migrateFridayCronStoreState(state));
	}
}

export { defaultState as defaultFridayCronJobState };
