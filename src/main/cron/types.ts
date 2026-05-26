import type { ScheduledTask } from 'node-cron';
import type { CronStoredTarget, CronTask } from '../../shared/cron';

export interface CronJobOptions {
	name?: string;
	description?: string;
	timezone?: string;
	enabled?: boolean;
	providerId?: string;
	modelId?: string;
	target?: CronStoredTarget;
	runOnStart?: boolean;
}

export interface RegisteredJob {
	id: string;
	expression: string;
	timezone?: string;
	task: ScheduledTask;
}

export type CronTaskHandler = (task: CronTask) => void | Promise<void>;
