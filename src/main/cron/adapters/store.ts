import Store from 'electron-store';
import type {
	CronExecutionRecord,
	CronSchedule,
	CronScheduleEvent,
	CronScheduleFilter,
	CronScheduleId,
	CronScheduleStore,
	CronScheduleStatus,
	CronScheduleVisibility,
	CronStoreState,
} from '../core/types';
import {
	CronScheduleConflictError,
	CronScheduleNotFoundError,
	CronScheduleStoreError,
} from '../core/errors';
import { isActiveSchedule } from '../core/validation';
import { CRON_STORE_SCHEMA_VERSION } from '../constants';

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function matchesValue<T extends string>(candidate: T | undefined, expected: T | T[] | undefined): boolean {
	if (!expected) return true;
	if (!candidate) return false;
	return Array.isArray(expected) ? expected.includes(candidate) : candidate === expected;
}

export function emptyCronStoreState(): CronStoreState {
	return {
		schemaVersion: CRON_STORE_SCHEMA_VERSION,
		schedules: [],
		events: [],
		executions: [],
		locks: {},
		confirmations: [],
		quarantined: [],
	};
}

export function migrateCronStoreState(raw: unknown): CronStoreState {
	if (!isRecord(raw)) return emptyCronStoreState();
	const base = emptyCronStoreState();
	return {
		schemaVersion: CRON_STORE_SCHEMA_VERSION,
		schedules: Array.isArray(raw.schedules) ? raw.schedules.filter(isRecord) as unknown as CronStoreState['schedules'] : base.schedules,
		events: Array.isArray(raw.events) ? raw.events.filter(isRecord) as unknown as CronStoreState['events'] : base.events,
		executions: Array.isArray(raw.executions) ? raw.executions.filter(isRecord) as unknown as CronStoreState['executions'] : base.executions,
		locks: isRecord(raw.locks) ? raw.locks as CronStoreState['locks'] : base.locks,
		confirmations: Array.isArray(raw.confirmations)
			? raw.confirmations.filter(isRecord) as unknown as CronStoreState['confirmations']
			: base.confirmations,
		quarantined: Array.isArray(raw.quarantined) ? raw.quarantined.filter(isRecord) as CronStoreState['quarantined'] : base.quarantined,
	};
}

export class InMemoryCronScheduleStore implements CronScheduleStore {
	private readonly schedules = new Map<CronScheduleId, CronSchedule>();
	private readonly eventsBySchedule = new Map<CronScheduleId, CronScheduleEvent[]>();
	private readonly executionsBySchedule = new Map<CronScheduleId, CronExecutionRecord[]>();
	private readonly executionsByIdempotencyKey = new Map<string, CronExecutionRecord>();
	private readonly locks = new Map<CronScheduleId, { runnerId: string; expiresAt: string }>();

	async createSchedule(schedule: CronSchedule): Promise<CronSchedule> {
		if (this.schedules.has(schedule.id)) {
			throw new CronScheduleConflictError(`Schedule already exists: ${schedule.id}`, {
				scheduleId: schedule.id,
			});
		}
		this.schedules.set(schedule.id, clone(schedule));
		return clone(schedule);
	}

	async updateSchedule(scheduleId: CronScheduleId, patch: Partial<CronSchedule>): Promise<CronSchedule> {
		const current = await this.getSchedule(scheduleId);
		const next: CronSchedule = {
			...current,
			...clone(patch),
			id: current.id,
			metadata: {
				...current.metadata,
				...(patch.metadata ?? {}),
			},
			taskMetadata: {
				...current.taskMetadata,
				...(patch.taskMetadata ?? {}),
			},
			audit: patch.audit ?? current.audit,
		};
		this.schedules.set(scheduleId, clone(next));
		return clone(next);
	}

	async getSchedule(scheduleId: CronScheduleId): Promise<CronSchedule> {
		const schedule = this.schedules.get(scheduleId);
		if (!schedule) throw new CronScheduleNotFoundError(scheduleId);
		return clone(schedule);
	}

	async listSchedules(filter: CronScheduleFilter = {}): Promise<CronSchedule[]> {
		const schedules = [...this.schedules.values()]
			.filter((schedule) => filter.includeDeleted || schedule.status !== 'deleted')
			.filter((schedule) => matchesValue(schedule.status, filter.status as CronScheduleStatus | CronScheduleStatus[] | undefined))
			.filter((schedule) => matchesValue(schedule.source, filter.source))
			.filter((schedule) => !filter.sourceId || schedule.sourceId === filter.sourceId)
			.filter((schedule) => !filter.ownerUserId || schedule.ownerUserId === filter.ownerUserId)
			.filter((schedule) => !filter.sessionId || schedule.sessionId === filter.sessionId)
			.filter((schedule) =>
				matchesValue(schedule.visibility, filter.visibility as CronScheduleVisibility | CronScheduleVisibility[] | undefined)
			)
			.filter((schedule) => !filter.taskType || schedule.taskType === filter.taskType)
			.filter((schedule) => !filter.tag || schedule.taskTags.includes(filter.tag))
			.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
		return clone(typeof filter.limit === 'number' ? schedules.slice(0, filter.limit) : schedules);
	}

	async deleteSchedule(scheduleId: CronScheduleId): Promise<void> {
		const now = new Date().toISOString();
		await this.updateSchedule(scheduleId, {
			status: 'deleted',
			enabled: false,
			deletedAt: now,
			updatedAt: now,
		});
	}

	async appendScheduleEvent(event: CronScheduleEvent): Promise<void> {
		const events = this.eventsBySchedule.get(event.scheduleId) ?? [];
		events.push(clone(event));
		this.eventsBySchedule.set(event.scheduleId, events);
	}

	async getScheduleEvents(scheduleId: CronScheduleId): Promise<CronScheduleEvent[]> {
		return clone(this.eventsBySchedule.get(scheduleId) ?? []);
	}

	async recordExecution(record: CronExecutionRecord): Promise<void> {
		if (this.executionsByIdempotencyKey.has(record.idempotencyKey)) return;
		const executions = this.executionsBySchedule.get(record.scheduleId) ?? [];
		executions.push(clone(record));
		this.executionsBySchedule.set(record.scheduleId, executions);
		this.executionsByIdempotencyKey.set(record.idempotencyKey, clone(record));
	}

	async listExecutions(scheduleId: CronScheduleId): Promise<CronExecutionRecord[]> {
		return clone(this.executionsBySchedule.get(scheduleId) ?? []);
	}

	async getExecutionByIdempotencyKey(idempotencyKey: string): Promise<CronExecutionRecord | undefined> {
		const execution = this.executionsByIdempotencyKey.get(idempotencyKey);
		return execution ? clone(execution) : undefined;
	}

	async acquireScheduleLock(scheduleId: CronScheduleId, runnerId: string, ttlMs: number): Promise<boolean> {
		const lock = this.locks.get(scheduleId);
		const now = Date.now();
		if (lock && Date.parse(lock.expiresAt) > now && lock.runnerId !== runnerId) return false;
		this.locks.set(scheduleId, {
			runnerId,
			expiresAt: new Date(now + ttlMs).toISOString(),
		});
		return true;
	}

	async releaseScheduleLock(scheduleId: CronScheduleId, runnerId: string): Promise<void> {
		const lock = this.locks.get(scheduleId);
		if (!lock || lock.runnerId !== runnerId) return;
		this.locks.delete(scheduleId);
	}

	async listActiveSchedules(): Promise<CronSchedule[]> {
		return clone([...this.schedules.values()].filter(isActiveSchedule));
	}

	async listRecoverableSchedules(): Promise<CronSchedule[]> {
		return this.listActiveSchedules();
	}

	async listDueSchedules(now: Date): Promise<CronSchedule[]> {
		return clone(
			[...this.schedules.values()]
				.filter(isActiveSchedule)
				.filter((schedule) => Boolean(schedule.nextRunAt && Date.parse(schedule.nextRunAt) <= now.getTime()))
				.sort((a, b) => Date.parse(a.nextRunAt ?? '') - Date.parse(b.nextRunAt ?? ''))
		);
	}
}

export class ElectronStoreCronScheduleStore implements CronScheduleStore {
	private readonly store: Store<CronStoreState>;

	constructor(store?: Store<CronStoreState>) {
		this.store =
			store ??
			new Store<CronStoreState>({
				name: 'cron',
				accessPropertiesByDotNotation: false,
			});
	}

	async createSchedule(schedule: CronSchedule): Promise<CronSchedule> {
		return this.write((state) => {
			if (state.schedules.some((entry) => entry.id === schedule.id)) {
				throw new CronScheduleConflictError(`Schedule already exists: ${schedule.id}`, {
					scheduleId: schedule.id,
				});
			}
			state.schedules.push(clone(schedule));
			return schedule;
		});
	}

	async updateSchedule(scheduleId: CronScheduleId, patch: Partial<CronSchedule>): Promise<CronSchedule> {
		return this.write((state) => {
			const index = state.schedules.findIndex((schedule) => schedule.id === scheduleId);
			if (index === -1) throw new CronScheduleNotFoundError(scheduleId);
			const current = state.schedules[index]!;
			const next: CronSchedule = {
				...current,
				...clone(patch),
				id: current.id,
				metadata: {
					...current.metadata,
					...(patch.metadata ?? {}),
				},
				taskMetadata: {
					...current.taskMetadata,
					...(patch.taskMetadata ?? {}),
				},
				audit: patch.audit ?? current.audit,
			};
			state.schedules[index] = next;
			return next;
		});
	}

	async getSchedule(scheduleId: CronScheduleId): Promise<CronSchedule> {
		const schedule = this.read().schedules.find((entry) => entry.id === scheduleId);
		if (!schedule) throw new CronScheduleNotFoundError(scheduleId);
		return clone(schedule);
	}

	async listSchedules(filter: CronScheduleFilter = {}): Promise<CronSchedule[]> {
		const schedules = this.read().schedules
			.filter((schedule) => filter.includeDeleted || schedule.status !== 'deleted')
			.filter((schedule) => matchesValue(schedule.status, filter.status as CronScheduleStatus | CronScheduleStatus[] | undefined))
			.filter((schedule) => matchesValue(schedule.source, filter.source))
			.filter((schedule) => !filter.sourceId || schedule.sourceId === filter.sourceId)
			.filter((schedule) => !filter.ownerUserId || schedule.ownerUserId === filter.ownerUserId)
			.filter((schedule) => !filter.sessionId || schedule.sessionId === filter.sessionId)
			.filter((schedule) =>
				matchesValue(schedule.visibility, filter.visibility as CronScheduleVisibility | CronScheduleVisibility[] | undefined)
			)
			.filter((schedule) => !filter.taskType || schedule.taskType === filter.taskType)
			.filter((schedule) => !filter.tag || schedule.taskTags.includes(filter.tag))
			.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
		return clone(typeof filter.limit === 'number' ? schedules.slice(0, filter.limit) : schedules);
	}

	async deleteSchedule(scheduleId: CronScheduleId): Promise<void> {
		const now = new Date().toISOString();
		await this.updateSchedule(scheduleId, {
			status: 'deleted',
			enabled: false,
			deletedAt: now,
			updatedAt: now,
		});
	}

	async appendScheduleEvent(event: CronScheduleEvent): Promise<void> {
		await this.write((state) => {
			state.events.push(clone(event));
			return undefined;
		});
	}

	async getScheduleEvents(scheduleId: CronScheduleId): Promise<CronScheduleEvent[]> {
		return clone(this.read().events.filter((event) => event.scheduleId === scheduleId));
	}

	async recordExecution(record: CronExecutionRecord): Promise<void> {
		await this.write((state) => {
			if (state.executions.some((entry) => entry.idempotencyKey === record.idempotencyKey)) return undefined;
			state.executions.push(clone(record));
			return undefined;
		});
	}

	async listExecutions(scheduleId: CronScheduleId): Promise<CronExecutionRecord[]> {
		return clone(this.read().executions.filter((record) => record.scheduleId === scheduleId));
	}

	async getExecutionByIdempotencyKey(idempotencyKey: string): Promise<CronExecutionRecord | undefined> {
		const record = this.read().executions.find((entry) => entry.idempotencyKey === idempotencyKey);
		return record ? clone(record) : undefined;
	}

	async acquireScheduleLock(scheduleId: CronScheduleId, runnerId: string, ttlMs: number): Promise<boolean> {
		return this.write((state) => {
			const now = Date.now();
			const lock = state.locks[scheduleId];
			if (lock && Date.parse(lock.expiresAt) > now && lock.runnerId !== runnerId) return false;
			state.locks[scheduleId] = {
				runnerId,
				expiresAt: new Date(now + ttlMs).toISOString(),
			};
			return true;
		});
	}

	async releaseScheduleLock(scheduleId: CronScheduleId, runnerId: string): Promise<void> {
		await this.write((state) => {
			const lock = state.locks[scheduleId];
			if (lock?.runnerId === runnerId) delete state.locks[scheduleId];
			return undefined;
		});
	}

	async listActiveSchedules(): Promise<CronSchedule[]> {
		return clone(this.read().schedules.filter(isActiveSchedule));
	}

	async listRecoverableSchedules(): Promise<CronSchedule[]> {
		return this.listActiveSchedules();
	}

	async listDueSchedules(now: Date): Promise<CronSchedule[]> {
		return clone(
			this.read().schedules
				.filter(isActiveSchedule)
				.filter((schedule) => Boolean(schedule.nextRunAt && Date.parse(schedule.nextRunAt) <= now.getTime()))
				.sort((a, b) => Date.parse(a.nextRunAt ?? '') - Date.parse(b.nextRunAt ?? ''))
		);
	}

	private read(): CronStoreState {
		try {
			return migrateCronStoreState(this.store.store);
		} catch (error) {
			throw new CronScheduleStoreError('Failed to read cron store state.', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async write<T>(mutate: (state: CronStoreState) => T): Promise<T> {
		try {
			const state = this.read();
			const result = mutate(state);
			this.store.store = migrateCronStoreState(state);
			return clone(result);
		} catch (error) {
			if (error instanceof CronScheduleConflictError || error instanceof CronScheduleNotFoundError) throw error;
			throw new CronScheduleStoreError('Failed to write cron store state.', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
