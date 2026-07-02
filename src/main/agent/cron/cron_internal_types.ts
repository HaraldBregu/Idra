import type { CronScheduleEvent } from './cron_types';

export type CronEventListener = (event: CronScheduleEvent) => void;

export interface CronJobHandle {
	stop(): void;
	getNextRun(): Date | null;
}
