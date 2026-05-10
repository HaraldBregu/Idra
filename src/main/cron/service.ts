import cron from 'node-cron';
import type { Disposable } from '../core/service-container';
import type { LoggerService } from '../logger';
import type { StoreService } from '../store';
import type { CronTask } from '../../shared/cron';
import type { CronJobOptions, CronTaskHandler, RegisteredJob } from './types';

/**
 * Schedules and manages recurring jobs via node-cron. Tasks are persisted
 * to StoreService so they survive app restart, and reloaded via restore().
 */
export class CronService implements Disposable {
	private readonly store: StoreService;
	private readonly logger: LoggerService;
	private readonly jobs = new Map<string, RegisteredJob>();

	constructor(store: StoreService, logger: LoggerService) {
		this.store = store;
		this.logger = logger;
	}

	schedule(
		id: string,
		expression: string,
		message: string,
		handler: () => void | Promise<void>,
		options: CronJobOptions = {}
	): CronTask {
		if (this.jobs.has(id)) {
			throw new Error(`Cron job "${id}" is already registered`);
		}

		if (!cron.validate(expression)) {
			throw new Error(`Invalid cron expression for "${id}": ${expression}`);
		}

		const task = cron.schedule(
			expression,
			async () => {
				// eslint-disable-next-line no-console
				console.log(`[cron] tick ${id} '${expression}' — ${message}`);
				try {
					await handler();
				} catch (err) {
					this.logger.error('CronService', `Job "${id}" failed`, err);
				}
			},
			{ timezone: options.timezone }
		);

		this.jobs.set(id, { id, expression, timezone: options.timezone, task });
		const record: CronTask = {
			id,
			expression,
			message,
			timezone: options.timezone,
			createdAt: new Date().toISOString(),
		};
		this.persistTask(record);
		this.logger.info('CronService', `Scheduled job "${id}" with "${expression}"`);

		if (options.runOnStart) {
			void Promise.resolve(handler()).catch((err) => {
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
		this.removePersistedTask(id);
		this.logger.info('CronService', `Unscheduled job "${id}"`);
	}

	/**
	 * Reload tasks persisted in the store and re-schedule them using the
	 * supplied dispatcher. Should be called once on startup.
	 */
	restore(dispatcher: CronTaskHandler): void {
		const tasks = this.store.getCronTasks();
		if (tasks.length === 0) {
			this.logger.info('CronService', 'No persisted cron tasks to restore');
			return;
		}

		let restored = 0;
		for (const task of tasks) {
			if (this.jobs.has(task.id)) continue;
			if (!cron.validate(task.expression)) {
				this.logger.warn('CronService', `Skipping invalid persisted task "${task.id}": ${task.expression}`);
				continue;
			}
			const scheduled = cron.schedule(
				task.expression,
				async () => {
					try {
						await dispatcher(task);
					} catch (err) {
						this.logger.error('CronService', `Restored job "${task.id}" failed`, err);
					}
				},
				{ timezone: task.timezone }
			);
			this.jobs.set(task.id, {
				id: task.id,
				expression: task.expression,
				timezone: task.timezone,
				task: scheduled,
			});
			restored++;
		}
		this.logger.info('CronService', `Restored ${restored} cron task(s) from store`);
	}

	listJobs(): { id: string; expression: string }[] {
		return Array.from(this.jobs.values()).map(({ id, expression }) => ({ id, expression }));
	}

	getTasks(): CronTask[] {
		return this.store.getCronTasks();
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
		this.logger.info('CronService', 'Disposed');
	}

	private persistTask(task: CronTask): void {
		const tasks = this.store.getCronTasks().filter((t) => t.id !== task.id);
		tasks.push(task);
		this.store.setCronTasks(tasks);
	}

	private removePersistedTask(id: string): void {
		const tasks = this.store.getCronTasks().filter((t) => t.id !== id);
		this.store.setCronTasks(tasks);
	}
}
