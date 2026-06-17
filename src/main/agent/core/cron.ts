import type { CronTaskData } from '../../../shared/app/cron';

export abstract class CronJob<TData extends CronTaskData = CronTaskData> {
	abstract readonly id: string;
	abstract readonly expression: string;
	abstract readonly data: TData;
	readonly name?: string;
	readonly description?: string;
	readonly timezone?: string;
	readonly enabled?: boolean;
	readonly runOnStart?: boolean;

	abstract run(): void | Promise<void>;
}
