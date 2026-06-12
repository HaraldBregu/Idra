import cron from 'node-cron';
import type {
	CronJobInfo,
	CronTask,
	CronTaskData,
} from '../../../shared/app/cron';
import type { CronLogger } from '../core/logger';
import type { CronJobOptions, RegisteredJob } from '../types';

export class NodeCronJobRegistry {
	private readonly jobs = new Map<string, RegisteredJob>();

	constructor(
		private readonly logger: CronLogger,
		private readonly automaticEnabled: boolean
	) {}

	schedule<TData extends CronTaskData>(
		id: string,
		expression: string,
		data: TData,
		handler: () => void | Promise<void>,
		options: CronJobOptions = {}
	): CronTask<TData> {
		if (this.jobs.has(id)) {
			throw new Error(`Cron job "${id}" is already registered`);
		}

		if (!cron.validate(expression)) {
			throw new Error(`Invalid cron expression for "${id}": ${expression}`);
		}

		const record = this.createRecord(id, expression, data, options);
		if (!this.automaticEnabled) {
			this.logger.warn(
				'CronService',
				`Saved job "${id}" while cron automatic execution is disabled`
			);
			return record;
		}

		const task = cron.schedule(
			expression,
			async () => {
				try {
					await handler();
					this.logger.info('CronService', `Job "${id}" completed`);
				} catch (err) {
					this.logger.error('CronService', `Job "${id}" failed`, err);
				}
			},
			{ timezone: options.timezone }
		);

		this.jobs.set(id, { id, expression, timezone: options.timezone, task });
		this.logger.info('CronService', `Scheduled job "${id}" with "${expression}"`);

		if (options.runOnStart) {
			void Promise.resolve(handler())
				.then(() => {
					this.logger.info('CronService', `Initial run of "${id}" completed`);
				})
				.catch((err) => {
					this.logger.error('CronService', `Initial run of "${id}" failed`, err);
				});
		}

		return record;
	}

	unschedule(id: string): void {
		const job = this.jobs.get(id);
		if (!job) return;
		job.task.stop();
		this.jobs.delete(id);
		this.logger.info('CronService', `Unscheduled job "${id}"`);
	}

	listJobs(): { id: string; expression: string }[] {
		return Array.from(this.jobs.values()).map(({ id, expression }) => ({ id, expression }));
	}

	has(id: string): boolean {
		return this.jobs.has(id);
	}

	destroy(): void {
		for (const job of this.jobs.values()) {
			try {
				job.task.stop();
			} catch (err) {
				this.logger.error('CronService', `Failed to stop job "${job.id}"`, err);
			}
		}
		this.jobs.clear();
	}

	private createRecord<TData extends CronTaskData>(
		id: string,
		expression: string,
		data: TData,
		options: CronJobOptions
	): CronTask<TData> {
		const now = new Date().toISOString();
		const enabled = options.enabled ?? true;
		return {
			id,
			name: options.name?.trim() || id,
			description: options.description?.trim() || undefined,
			schedule: expression,
			expression,
			timezone: options.timezone ?? 'UTC',
			enabled,
			status: enabled ? 'active' : 'disabled',
			providerId: options.providerId,
			modelId: options.modelId,
			target: options.target ?? 'job',
			payload: data,
			data,
			createdAt: now,
			updatedAt: now,
			runCount: 0,
			failureCount: 0,
		};
	}
}
