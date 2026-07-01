import type { CronScheduleEvent } from './cron-types';

export type CronEventListener = (event: CronScheduleEvent) => void;

export interface CronJobHandle {
	stop(): void;
	getNextRun(): Date | null;
}
