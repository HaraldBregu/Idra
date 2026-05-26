import cron from 'node-cron';
import type { Disposable } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { ChannelRegistry } from '../channels';
import type { AgentService } from '../service';
import type { HeartbeatService } from '../heartbeat';
import type { TaskManager } from '../tasks';
import {
	isCronTaskData,
	type CronExecutionRecord,
	type FridayCronActionRequest,
	type FridayCronActionResponse,
	type CronNextRunPreview,
	type CronSchedule,
	type CronScheduleCreateRequest,
	type CronScheduleEvent,
	type CronScheduleFilter,
	type CronScheduleUpdateRequest,
	type CronTask,
	type CronTaskData,
	type CronTaskView,
} from '../../shared/cron';
import type { CronJobOptions, CronTaskHandler, RegisteredJob } from './types';
import type { CronActorContext } from './core/cron.types';
import { ElectronStoreCronScheduleStore } from './store/electron-store-cron-schedule-store';
import { ElectronStoreCronStore, type CronPersistenceStore } from './store/electron-store-cron-store';
import { DefaultCronScheduleAccessPolicy } from './security/cron-access-policy';
import { CronSchedulerService, DEFAULT_CRON_RUN_POLICY } from './scheduler/cron-scheduler';
import {
	DelegatingCronScheduleRunner,
	TaskManagerCronScheduleRunner,
} from './scheduler/cron-runner';
import { ElectronStoreFridayCronStore } from './friday/store';
import {
	GatewayFridayCronDelivery,
	AgentServiceFridayCronExecutor,
	TaskManagerFridayCronExecutor,
} from './friday/runtime-adapters';
import {
	NoopFridayCronDelivery,
	NoopFridayCronExecutor,
	FridayCronScheduler,
	type FridayCronActor,
	type FridayCronSchedulerOptions,
} from './friday/scheduler';
import type { FridayCronNormalizeContext } from './friday/normalize';

interface NextRunCapable {
	getNextRun?: () => Date | null;
}

export interface CronServiceOptions {
	enabled?: boolean;
	store?: CronPersistenceStore;
	friday?: FridayCronSchedulerOptions;
}

/**
 * Schedules and manages recurring jobs via node-cron. Tasks are persisted
 * to cron-owned Electron Store state so they survive app restart, and reloaded via restore().
 *
 * Generic over the data payload: callers parameterize schedule<TData>() with
 * whatever shape they want as long as it has a string `type` discriminator.
 */
export class CronService implements Disposable {
	private readonly store: CronPersistenceStore;
	private readonly logger: LoggerService;
	private readonly jobs = new Map<string, RegisteredJob>();
	private readonly scheduleStore: ElectronStoreCronScheduleStore;
	private readonly runner: DelegatingCronScheduleRunner;
	private readonly scheduler: CronSchedulerService;
	private readonly friday: FridayCronScheduler;
	private readonly automaticEnabled: boolean;
	private taskManager?: TaskManager;

	constructor(logger: LoggerService, options: CronServiceOptions = {}) {
		this.store = options.store ?? new ElectronStoreCronStore();
		this.logger = logger;
		this.automaticEnabled =
			options.enabled ?? (process.env.SKIP_CRON !== '1' && process.env.CRON_ENABLED !== 'false');
		this.scheduleStore = new ElectronStoreCronScheduleStore(this.store);
		this.runner = new DelegatingCronScheduleRunner();
		const accessPolicy = new DefaultCronScheduleAccessPolicy({
			minIntervalMs: DEFAULT_CRON_RUN_POLICY.minIntervalMs,
			highFrequencyThresholdMs: DEFAULT_CRON_RUN_POLICY.highFrequencyThresholdMs,
			maxActiveSchedulesPerUser: 250,
		});
		this.scheduler = new CronSchedulerService(
			this.scheduleStore,
			this.runner,
			accessPolicy,
			{},
			logger
		);
		this.friday = new FridayCronScheduler(
			new ElectronStoreFridayCronStore(this.store),
			new NoopFridayCronExecutor(),
			new NoopFridayCronDelivery(),
			{
				...options.friday,
				enabled: this.automaticEnabled,
			},
			logger
		);
	}

	configureTaskRuntime(dependencies: { taskManager: TaskManager }): void {
		this.taskManager = dependencies.taskManager;
		this.runner.setDelegate(new TaskManagerCronScheduleRunner(dependencies.taskManager));
	}

	get events(): CronSchedulerService['events'] {
		return this.scheduler.events;
	}

	async start(): Promise<void> {
		if (!this.automaticEnabled) {
			this.logger.warn('CronService', 'Cron automatic execution is globally disabled.');
			await this.friday.start();
			return;
		}
		await this.scheduler.start();
		await this.friday.start();
	}

	async stop(): Promise<void> {
		await this.scheduler.stop();
		await this.friday.stop();
	}

	async reload(): Promise<void> {
		await this.scheduler.reload();
		if (this.automaticEnabled) await this.friday.recoverStartup();
	}

	configureFridayRuntime(dependencies: {
		agentService?: AgentService;
		eventBus?: EventBus;
		channelRegistry?: ChannelRegistry;
		heartbeat?: HeartbeatService;
	}): void {
		const directExecutor = dependencies.agentService
			? new AgentServiceFridayCronExecutor(dependencies.agentService, dependencies.heartbeat)
			: undefined;
		if (dependencies.agentService) {
			this.friday.setExecutor(
				this.taskManager && dependencies.eventBus
					? new TaskManagerFridayCronExecutor(
							this.taskManager,
							dependencies.eventBus,
							directExecutor!
						)
					: directExecutor!
			);
		}
		this.friday.setDelivery(
			new GatewayFridayCronDelivery({
				eventBus: dependencies.eventBus,
				channelRegistry: dependencies.channelRegistry,
				logger: this.logger,
			})
		);
	}

	fridayAction(
		request: FridayCronActionRequest,
		actor?: FridayCronActor,
		context: Omit<FridayCronNormalizeContext, 'actor'> = {}
	): Promise<FridayCronActionResponse> {
		const effectiveActor = actor ?? { role: 'owner' as const };
		return this.friday.handleAction(request, effectiveActor, context);
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
	): ReturnType<CronSchedulerService['runScheduleNow']> {
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

		const record: CronTask<TData> = {
			id,
			expression,
			data,
			timezone: options.timezone,
			createdAt: new Date().toISOString(),
		};

		if (!this.automaticEnabled) {
			this.persistTask(record);
			this.logger.warn(
				'CronService',
				`Saved job "${id}" while cron automatic execution is disabled`
			);
			return record;
		}

		const task = cron.schedule(
			expression,
			async () => {
				console.log(`[cron] tick ${id} '${expression}' — [${data.type}]`);
				this.recordRun(id);
				try {
					await handler();
				} catch (err) {
					this.logger.error('CronService', `Job "${id}" failed`, err);
				}
			},
			{ timezone: options.timezone }
		);

		this.jobs.set(id, { id, expression, timezone: options.timezone, task });
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
		if (!this.automaticEnabled) {
			this.logger.warn(
				'CronService',
				'Cron restore skipped because automatic execution is disabled'
			);
			return;
		}
		const raw = this.store.getCronTasks();
		if (raw.length === 0) {
			this.logger.info('CronService', 'No persisted cron tasks to restore');
			return;
		}

		const tasks = this.migrateTasks(raw);

		let restored = 0;
		for (const task of tasks) {
			if (this.jobs.has(task.id)) continue;
			if (!cron.validate(task.expression)) {
				this.logger.warn(
					'CronService',
					`Skipping invalid persisted task "${task.id}": ${task.expression}`
				);
				continue;
			}
			const scheduled = cron.schedule(
				task.expression,
				async () => {
					console.log(`[cron] tick ${task.id} '${task.expression}' — [${task.data.type}]`);
					this.recordRun(task.id);
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

	getTasks(): CronTaskView[] {
		const tasks = this.migrateTasks(this.store.getCronTasks());
		return tasks.map((t) => {
			const job = this.jobs.get(t.id);
			const next = (job?.task as NextRunCapable | undefined)?.getNextRun?.() ?? null;
			return next ? { ...t, nextRun: next.toISOString() } : { ...t };
		});
	}

	has(id: string): boolean {
		return this.jobs.has(id);
	}

	destroy(): void {
		void this.scheduler.stop();
		void this.friday.stop();
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
		const tasks = this.migrateTasks(this.store.getCronTasks()).filter((t) => t.id !== task.id);
		tasks.push(task);
		this.store.setCronTasks(tasks);
	}

	private removePersistedTask(id: string): void {
		const tasks = this.migrateTasks(this.store.getCronTasks()).filter((t) => t.id !== id);
		this.store.setCronTasks(tasks);
	}

	private recordRun(id: string): void {
		const tasks = this.migrateTasks(this.store.getCronTasks());
		const idx = tasks.findIndex((t) => t.id === id);
		if (idx === -1) return;
		tasks[idx] = { ...tasks[idx], lastRun: new Date().toISOString() };
		this.store.setCronTasks(tasks);
	}

	/**
	 * Coerce persisted entries into CronTask shape. Accepts existing valid
	 * records as-is, migrates legacy `{ message }` rows into
	 * `{ data: { type: 'message', message } }`, and drops anything else.
	 */
	private migrateTasks(raw: readonly unknown[]): CronTask[] {
		const out: CronTask[] = [];
		for (const entry of raw) {
			if (!entry || typeof entry !== 'object') continue;
			const r = entry as Record<string, unknown>;
			if (typeof r.id !== 'string' || typeof r.expression !== 'string') continue;
			const data = isCronTaskData(r.data)
				? r.data
				: typeof r.message === 'string'
					? { type: 'message' as const, message: r.message }
					: null;
			if (!data) continue;
			out.push({
				id: r.id,
				expression: r.expression,
				data,
				timezone: typeof r.timezone === 'string' ? r.timezone : undefined,
				createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
				lastRun: typeof r.lastRun === 'string' ? r.lastRun : undefined,
			});
		}
		return out;
	}
}
