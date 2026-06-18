import type {
	CronSchedule,
	CronScheduleFilter,
	CronScheduleId,
	PersistedCronState,
} from '../types';
import { clone } from './clone';
import { matchesValue } from './match';

/**
 * Persistence and query layer for cron schedules. Subclasses supply the raw
 * state read/write (electron-store, in-memory, etc.); the shared CRUD,
 * filtering, and cloning logic lives here so it is backend-agnostic.
 */
export abstract class CronStore {
	protected abstract readState(): PersistedCronState;
	protected abstract writeState<T>(mutate: (state: PersistedCronState) => T): T;

	isEnabled(fallback: boolean): boolean {
		return this.readState().enabled ?? fallback;
	}

	setEnabled(enabled: boolean): void {
		this.writeState((state) => {
			state.enabled = enabled;
		});
	}

	list(filter: CronScheduleFilter = {}): CronSchedule[] {
		const schedules = this.readState()
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
		const schedule = this.readState().schedules.find((entry) => entry.id === scheduleId);
		return schedule ? clone(schedule) : undefined;
	}

	require(scheduleId: CronScheduleId): CronSchedule {
		const schedule = this.find(scheduleId);
		if (!schedule) throw new Error(`Cron schedule not found: ${scheduleId}`);
		return schedule;
	}

	create(schedule: CronSchedule): CronSchedule {
		return this.writeState((state) => {
			state.schedules.push(clone(schedule));
			return clone(schedule);
		});
	}

	update(scheduleId: CronScheduleId, patch: Partial<CronSchedule>): CronSchedule {
		return this.writeState((state) => {
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
}
