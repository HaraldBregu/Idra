import type { ScheduledTask } from 'node-cron';
import type { CronTask } from '../../shared/cron';

export interface CronJobOptions {
	timezone?: string;
	runOnStart?: boolean;
}

export interface RegisteredJob {
	id: string;
	expression: string;
	timezone?: string;
	task: ScheduledTask;
}

export type CronTaskHandler = (task: CronTask) => void | Promise<void>;
