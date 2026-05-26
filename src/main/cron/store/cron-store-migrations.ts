import type { CronSchedule, CronStoreState, CronStoredSchedule } from '../../../shared/cron';

export const CRON_STORE_SCHEMA_VERSION = 1;

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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function storedScheduleConfig(schedule: Record<string, unknown>): CronStoredSchedule {
	if (typeof schedule.schedule === 'string' || isRecord(schedule.schedule)) {
		return schedule.schedule as CronStoredSchedule;
	}
	if (typeof schedule.cronExpression === 'string') return schedule.cronExpression;
	return {
		type: typeof schedule.type === 'string' ? schedule.type : 'cron',
		...(typeof schedule.intervalMs === 'number' ? { intervalMs: schedule.intervalMs } : {}),
		...(typeof schedule.runAt === 'string' ? { runAt: schedule.runAt } : {}),
		...(typeof schedule.startAt === 'string' ? { startAt: schedule.startAt } : {}),
		...(typeof schedule.endAt === 'string' ? { endAt: schedule.endAt } : {}),
		...(typeof schedule.maxRuns === 'number' ? { maxRuns: schedule.maxRuns } : {}),
	};
}

function normalizeSchedule(value: Record<string, unknown>): CronSchedule {
	const taskType = typeof value.taskType === 'string' ? value.taskType : 'cron.job';
	const taskInput = value.taskInput ?? {};
	return {
		...value,
		schedule: storedScheduleConfig(value),
		failureCount: typeof value.failureCount === 'number' ? value.failureCount : 0,
		target:
			typeof value.target === 'string'
				? value.target
				: taskType === 'agent' || taskType.startsWith('agent.')
					? 'agent'
					: 'job',
		payload: value.payload ?? taskInput,
		runCount: typeof value.runCount === 'number' ? value.runCount : 0,
	} as unknown as CronSchedule;
}

export function migrateCronStoreState(raw: unknown): CronStoreState {
	if (!isRecord(raw)) return emptyCronStoreState();
	const base = emptyCronStoreState();
	return {
		schemaVersion: CRON_STORE_SCHEMA_VERSION,
		schedules: Array.isArray(raw.schedules)
			? raw.schedules.filter(isRecord).map(normalizeSchedule)
			: base.schedules,
		events: Array.isArray(raw.events) ? raw.events.filter(isRecord) as unknown as CronStoreState['events'] : base.events,
		executions: Array.isArray(raw.executions) ? raw.executions.filter(isRecord) as unknown as CronStoreState['executions'] : base.executions,
		locks: isRecord(raw.locks) ? raw.locks as CronStoreState['locks'] : base.locks,
		confirmations: Array.isArray(raw.confirmations)
			? raw.confirmations.filter(isRecord) as unknown as CronStoreState['confirmations']
			: base.confirmations,
		quarantined: Array.isArray(raw.quarantined) ? raw.quarantined.filter(isRecord) as CronStoreState['quarantined'] : base.quarantined,
	};
}
