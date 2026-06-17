import Store from 'electron-store';
import type { CronSchedule, CronScheduleFilter, CronScheduleId } from '../../shared/app/cron';
import type { PersistedCronState } from './types';
import {
	CRON_STORE_DIRECTORY,
	CRON_STORE_FILE_NAME,
	CRON_STORE_SCHEMA_VERSION,
} from './constants';

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

function migrate(raw: unknown): PersistedCronState {
	if (!isRecord(raw)) return { schemaVersion: CRON_STORE_SCHEMA_VERSION, schedules: [] };
	return {
		schemaVersion: CRON_STORE_SCHEMA_VERSION,
		enabled: typeof raw.enabled === 'boolean' ? raw.enabled : undefined,
		schedules: Array.isArray(raw.schedules)
			? (raw.schedules.filter(isRecord) as unknown as CronSchedule[])
			: [],
	};
}

/** Persists cron schedules and the global enabled flag to the cron settings file. */
export class CronStore {
	private readonly store: Store<PersistedCronState>;

	constructor(store?: Store<PersistedCronState>) {
		this.store =
			store ??
			new Store<PersistedCronState>({
				name: CRON_STORE_FILE_NAME,
				cwd: CRON_STORE_DIRECTORY,
				accessPropertiesByDotNotation: false,
			});
	}

	getEnabled(): boolean | undefined {
		return this.read().enabled;
	}

	setEnabled(enabled: boolean): void {
		this.write((state) => {
			state.enabled = enabled;
		});
	}

	list(filter: CronScheduleFilter = {}): CronSchedule[] {
		const schedules = this.read()
			.schedules.filter((schedule) => filter.includeDeleted || schedule.status !== 'deleted')
			.filter((schedule) => matchesValue(schedule.status, filter.status))
			.filter((schedule) => matchesValue(schedule.source, filter.source))
			.filter((schedule) => !filter.sourceId || schedule.sourceId === filter.sourceId)
			.filter((schedule) => !filter.ownerUserId || schedule.ownerUserId === filter.ownerUserId)
			.filter((schedule) => !filter.sessionId || schedule.sessionId === filter.sessionId)
			.filter((schedule) => matchesValue(schedule.visibility, filter.visibility))
			.filter((schedule) => !filter.taskType || schedule.taskType === filter.taskType)
			.filter((schedule) => !filter.tag || schedule.taskTags.includes(filter.tag))
			.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
		return clone(typeof filter.limit === 'number' ? schedules.slice(0, filter.limit) : schedules);
	}

	find(scheduleId: CronScheduleId): CronSchedule | undefined {
		const schedule = this.read().schedules.find((entry) => entry.id === scheduleId);
		return schedule ? clone(schedule) : undefined;
	}

	create(schedule: CronSchedule): CronSchedule {
		return this.write((state) => {
			state.schedules.push(clone(schedule));
			return clone(schedule);
		});
	}

	update(scheduleId: CronScheduleId, patch: Partial<CronSchedule>): CronSchedule {
		return this.write((state) => {
			const index = state.schedules.findIndex((schedule) => schedule.id === scheduleId);
			if (index === -1) throw new Error(`Cron schedule not found: ${scheduleId}`);
			const current = state.schedules[index]!;
			const next: CronSchedule = {
				...current,
				...clone(patch),
				id: current.id,
				metadata: { ...current.metadata, ...(patch.metadata ?? {}) },
				taskMetadata: { ...current.taskMetadata, ...(patch.taskMetadata ?? {}) },
			};
			state.schedules[index] = next;
			return clone(next);
		});
	}

	private read(): PersistedCronState {
		return migrate(this.store.store);
	}

	private write<T>(mutate: (state: PersistedCronState) => T): T {
		const state = this.read();
		const result = mutate(state);
		this.store.store = state;
		return result;
	}
}
