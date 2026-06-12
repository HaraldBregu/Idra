import type { ScheduledTask } from 'node-cron';
import type { CronJobInfo, CronTask } from '../../shared/app/cron';

export interface CronJobOptions {
	timezone?: string;
	runOnStart?: boolean;
	enabled?: boolean;
	name?: string;
	description?: string;
	providerId?: string;
	modelId?: string;
	target?: string;
}

export interface RegisteredJob {
	id: string;
	expression: string;
	timezone?: string;
	task?: ScheduledTask;
	info: CronJobInfo;
}

export type CronTaskHandler = (task: CronTask) => void | Promise<void>;
