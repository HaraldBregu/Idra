import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
	OpenClawCronJobDefinition,
	OpenClawCronJobState,
	OpenClawCronRunRecord,
} from '../../../shared/cron';
import { acquireWriteLock } from '../../session/lock';
import {
	assertSafeCronId,
	openClawScheduleIdentity,
} from './validation';

const SCHEMA_VERSION = 1;

interface JobsFile {
	schemaVersion: number;
	jobs: OpenClawCronJobDefinition[];
}

interface StateFile {
	schemaVersion: number;
	jobs: Record<string, OpenClawCronJobState>;
}

export interface OpenClawCronSnapshot {
	jobs: OpenClawCronJobDefinition[];
	states: Record<string, OpenClawCronJobState>;
}

export interface OpenClawCronStore {
	load(): Promise<OpenClawCronSnapshot>;
	save(snapshot: OpenClawCronSnapshot): Promise<void>;
	appendRun(record: OpenClawCronRunRecord): Promise<void>;
	listRuns(jobId: string, limit?: number): Promise<OpenClawCronRunRecord[]>;
}

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
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

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
	try {
		return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
		throw error;
	}
}

async function writePrivateJson(filePath: string, value: unknown): Promise<void> {
	await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
	const lock = await acquireWriteLock(filePath);
	const tmp = `${filePath}.tmp`;
	try {
		await fs.writeFile(tmp, JSON.stringify(value, null, 2), {
			encoding: 'utf8',
			mode: 0o600,
		});
		await fs.rename(tmp, filePath);
		if (process.platform !== 'win32') {
			await fs.chmod(filePath, 0o600).catch(() => undefined);
			await fs.chmod(path.dirname(filePath), 0o700).catch(() => undefined);
		}
	} finally {
		await lock.release();
	}
}

export class FileOpenClawCronStore implements OpenClawCronStore {
	private readonly jobsPath: string;
	private readonly statePath: string;
	private readonly runsDir: string;

	constructor(private readonly rootDir: string) {
		this.jobsPath = path.join(rootDir, 'jobs.json');
		this.statePath = path.join(rootDir, 'jobs-state.json');
		this.runsDir = path.join(rootDir, 'runs');
	}

	async load(): Promise<OpenClawCronSnapshot> {
		await this.ensureRoot();
		const jobsFile = await readJson<JobsFile>(this.jobsPath, {
			schemaVersion: SCHEMA_VERSION,
			jobs: [],
		});
		const stateFile = await readJson<StateFile>(this.statePath, {
			schemaVersion: SCHEMA_VERSION,
			jobs: {},
		});
		const jobs = (jobsFile.jobs ?? []).filter((job) => {
			try {
				assertSafeCronId(job.id);
				return true;
			} catch {
				return false;
			}
		});
		const states: Record<string, OpenClawCronJobState> = {};
		let stateChanged = false;
		for (const job of jobs) {
			const current = stateFile.jobs?.[job.id];
			const normalized = normalizeState(job, current);
			states[job.id] = normalized;
			if (JSON.stringify(current ?? null) !== JSON.stringify(normalized)) {
				stateChanged = true;
			}
		}
		if (stateChanged || Object.keys(stateFile.jobs ?? {}).length !== jobs.length) {
			await this.writeState(states);
		}
		return { jobs: clone(jobs), states: clone(states) };
	}

	async save(snapshot: OpenClawCronSnapshot): Promise<void> {
		await this.ensureRoot();
		const jobs = clone(snapshot.jobs);
		const states: Record<string, OpenClawCronJobState> = {};
		for (const job of jobs) {
			assertSafeCronId(job.id);
			states[job.id] = normalizeState(job, snapshot.states[job.id]);
		}
		await writePrivateJson(this.jobsPath, { schemaVersion: SCHEMA_VERSION, jobs });
		await this.writeState(states);
	}

	async appendRun(record: OpenClawCronRunRecord): Promise<void> {
		assertSafeCronId(record.jobId, 'jobId');
		await fs.mkdir(this.runsDir, { recursive: true, mode: 0o700 });
		const filePath = path.join(this.runsDir, `${record.jobId}.jsonl`);
		const lock = await acquireWriteLock(filePath);
		try {
			await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, {
				encoding: 'utf8',
				mode: 0o600,
			});
			if (process.platform !== 'win32') {
				await fs.chmod(filePath, 0o600).catch(() => undefined);
				await fs.chmod(this.runsDir, 0o700).catch(() => undefined);
			}
		} finally {
			await lock.release();
		}
	}

	async listRuns(jobId: string, limit = 50): Promise<OpenClawCronRunRecord[]> {
		assertSafeCronId(jobId, 'jobId');
		const filePath = path.join(this.runsDir, `${jobId}.jsonl`);
		try {
			const lines = (await fs.readFile(filePath, 'utf8'))
				.split('\n')
				.map((line) => line.trim())
				.filter(Boolean);
			return lines
				.slice(Math.max(0, lines.length - Math.max(1, limit)))
				.map((line) => JSON.parse(line) as OpenClawCronRunRecord);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
			throw error;
		}
	}

	private async ensureRoot(): Promise<void> {
		await fs.mkdir(this.rootDir, { recursive: true, mode: 0o700 });
		await fs.mkdir(this.runsDir, { recursive: true, mode: 0o700 });
		if (process.platform !== 'win32') {
			await fs.chmod(this.rootDir, 0o700).catch(() => undefined);
			await fs.chmod(this.runsDir, 0o700).catch(() => undefined);
		}
	}

	private async writeState(states: Record<string, OpenClawCronJobState>): Promise<void> {
		await writePrivateJson(this.statePath, {
			schemaVersion: SCHEMA_VERSION,
			jobs: states,
		});
	}
}

export { defaultState as defaultOpenClawCronJobState };
