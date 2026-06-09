import cron from 'node-cron';
import {
	type CronExecutionRecord,
	type CronNextRunPreview,
	type CronSchedule,
	type CronScheduleCreateRequest,
	type CronScheduleEvent,
	type CronScheduleEventType,
	type CronScheduleFilter,
	type CronScheduleUpdateRequest,
	type CronScheduledTask,
	type CronStoredTarget,
	type CronTask,
	type CronTaskData,
} from '../../shared/app/cron';
import type { CronJobOptions, RegisteredJob } from './types';
import type { CronActorContext, CronScheduleStore } from './core/types';
import { ElectronStoreCronScheduleStore } from './store';
import { InMemoryCronScheduleRunner } from './runner';
import { CronSchedulerEngine } from './scheduler';

interface Disposable {
	destroy(): void | Promise<void>;
}

interface CronLogger {
	debug?(scope: string, message: string, metadata?: unknown): void;
	info(scope: string, message: string, metadata?: unknown): void;
	warn(scope: string, message: string, metadata?: unknown): void;
	error(scope: string, message: string, metadata?: unknown): void;
}

export type CronServiceEventListener = (event: CronScheduleEvent) => void;

export interface CronServiceEvents {
	subscribe(listener: CronServiceEventListener): () => void;
	subscribeToType(type: CronScheduleEventType, listener: CronServiceEventListener): () => void;
}

export type CronServiceActor = CronActorContext;
export type { CronJobOptions, CronTaskHandler } from './types';

export interface CronServiceOptions {
	enabled?: boolean;
	scheduleStore?: CronScheduleStore;
}

/**
 * Schedules and manages recurring jobs via node-cron and the cron scheduler
 * engine. In-memory jobs are tracked for the lifetime of the process.
 *
 * Generic over the data payload: callers parameterize schedule<TData>() with
 * whatever shape they want as long as it has a string `type` discriminator.
 */
export class CronService implements Disposable {
	private readonly logger: CronLogger;
	private readonly jobs = new Map<string, RegisteredJob>();
	private readonly scheduleStore: CronScheduleStore;
	private readonly scheduler: CronSchedulerEngine;
	private readonly automaticEnabled: boolean;

	constructor(logger: CronLogger, options: CronServiceOptions = {}) {
		this.logger = logger;
		this.automaticEnabled =
			options.enabled ?? (process.env.SKIP_CRON !== '1' && process.env.CRON_ENABLED !== 'false');
		this.scheduleStore = options.scheduleStore ?? new ElectronStoreCronScheduleStore();
		const accessPolicy = {
			authorize(): Promise<void> { return Promise.resolve(); },
			requiresConfirmation(): boolean { return false; },
			validateFrequency(): void { return undefined; },
		};
		this.scheduler = new CronSchedulerEngine(
			this.scheduleStore,
			new InMemoryCronScheduleRunner(),
			accessPolicy,
			{},
			logger
		);
	}

	get events(): CronServiceEvents {
		return this.scheduler.events;
	}

	async start(): Promise<void> {
		if (!this.automaticEnabled) {
			this.logger.warn('CronService', 'Cron automatic execution is globally disabled.');
			this.logger.info('CronService', 'Cron service started with automatic execution disabled.');
			return;
		}
		await this.scheduler.start();
		this.logger.info('CronService', 'Cron service started.');
	}

	async stop(): Promise<void> {
		await this.scheduler.stop();
		this.logger.info('CronService', 'Cron service stopped.');
	}

	async reload(): Promise<void> {
		this.logger.info('CronService', 'Cron service reload requested.');
		await this.scheduler.reload();
	}

	createSchedule(
		request: CronScheduleCreateRequest,
		actor?: CronActorContext
	): Promise<CronSchedule> {
		return this.scheduler.createSchedule(request, actor);
	}

	updateSchedule(
		scheduleId: string,
		patch: CronScheduleUpdateRequest,
		actor?: CronActorContext
	): Promise<CronSchedule> {
		return this.scheduler.updateSchedule(scheduleId, patch, actor);
	}

	pauseSchedule(scheduleId: string, actor?: CronActorContext): Promise<void> {
		return this.scheduler.pauseSchedule(scheduleId, actor);
	}

	resumeSchedule(scheduleId: string, actor?: CronActorContext): Promise<void> {
		return this.scheduler.resumeSchedule(scheduleId, actor);
	}

	deleteSchedule(scheduleId: string, actor?: CronActorContext): Promise<void> {
		return this.scheduler.deleteSchedule(scheduleId, actor);
	}

	getSchedule(scheduleId: string, actor?: CronActorContext): Promise<CronSchedule> {
		return this.scheduler.getSchedule(scheduleId, actor);
	}

	listSchedules(filter?: CronScheduleFilter, actor?: CronActorContext): Promise<CronSchedule[]> {
		return this.scheduler.listSchedules(filter, actor);
	}

	runScheduleNow(
		scheduleId: string,
		actor?: CronActorContext
	): Promise<CronScheduledTask> {
		return this.scheduler.runScheduleNow(scheduleId, actor);
	}

	computeNextRun(schedule: CronSchedule, from?: Date): Promise<Date | null> {
		return this.scheduler.computeNextRun(schedule, from);
	}

	processDueSchedules(now: Date): Promise<void> {
		return this.scheduler.processDueSchedules(now);
	}

	recoverSchedulesOnStartup(): Promise<void> {
		return this.scheduler.recoverSchedulesOnStartup();
	}

	getNextRuns(
		scheduleId: string,
		count: number,
		actor?: CronActorContext
	): Promise<CronNextRunPreview> {
		return this.scheduler.getNextRuns(scheduleId, count, actor);
	}

	async getScheduleEvents(scheduleId: string): Promise<CronScheduleEvent[]> {
		return scheduleId ? this.scheduleStore.getScheduleEvents(scheduleId) : [];
	}

	async getScheduleExecutions(scheduleId: string): Promise<CronExecutionRecord[]> {
		return scheduleId ? this.scheduleStore.listExecutions(scheduleId) : [];
	}

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

		const now = new Date().toISOString();
		const enabled = options.enabled ?? true;
		const record: CronTask<TData> = {
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
			target: options.target ?? this.targetForData(data),
			payload: data,
			data,
			createdAt: now,
			updatedAt: now,
			runCount: 0,
			failureCount: 0,
		};

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
		void this.scheduler.stop();
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

	private targetForData(data: CronTaskData): CronStoredTarget {
		if (data.type === 'agent') return 'agent';
		if (data.type === 'tool') return 'tool';
		if (data.type === 'task') return 'task';
		return 'job';
	}
}
