import type { CronStoreState } from '../core/cron.types';

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

export function migrateCronStoreState(raw: unknown): CronStoreState {
	if (!isRecord(raw)) return emptyCronStoreState();
	const base = emptyCronStoreState();
	return {
		schemaVersion: CRON_STORE_SCHEMA_VERSION,
		schedules: Array.isArray(raw.schedules) ? raw.schedules.filter(isRecord) as CronStoreState['schedules'] : base.schedules,
		events: Array.isArray(raw.events) ? raw.events.filter(isRecord) as CronStoreState['events'] : base.events,
		executions: Array.isArray(raw.executions) ? raw.executions.filter(isRecord) as CronStoreState['executions'] : base.executions,
		locks: isRecord(raw.locks) ? raw.locks as CronStoreState['locks'] : base.locks,
		confirmations: Array.isArray(raw.confirmations)
			? raw.confirmations.filter(isRecord) as CronStoreState['confirmations']
			: base.confirmations,
		quarantined: Array.isArray(raw.quarantined) ? raw.quarantined.filter(isRecord) as CronStoreState['quarantined'] : base.quarantined,
	};
}
