import cron from 'node-cron';
import type { Disposable } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { StoreService } from '../store';
import type { ChannelRegistry } from '../channels';
import type { AgentService } from '../service';
import { resolveDefaultUserDataPath, type UserDataDirectoryServicePort } from '../user-data';
import {
	isCronTaskData,
	type CronExecutionRecord,
	type OpenClawCronToolRequest,
	type OpenClawCronToolResponse,
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
import type { CronActorContext, CronTaskManagerPort } from './core/cron.types';
import { ElectronStoreCronScheduleStore } from './store/electron-store-cron-schedule-store';
import { DefaultCronScheduleAccessPolicy } from './security/cron-access-policy';
import { CronConfirmationManager } from './security/cron-confirmation-manager';
import {
	CronSchedulerService,
	DEFAULT_CRON_RUN_POLICY,
} from './scheduler/cron-scheduler';
import {
	StoreBackedCronTaskManager,
	TaskManagerCronScheduleRunner,
} from './scheduler/cron-runner';
import { FileOpenClawCronStore } from './openclaw/file-store';
import {
	GatewayOpenClawCronDelivery,
	AgentServiceOpenClawCronExecutor,
} from './openclaw/runtime-adapters';
import {
	NoopOpenClawCronDelivery,
	NoopOpenClawCronExecutor,
	OpenClawCronScheduler,
	type OpenClawCronActor,
	type OpenClawCronSchedulerOptions,
} from './openclaw/scheduler';

interface NextRunCapable {
	getNextRun?: () => Date | null;
}

export interface CronServiceOptions {
	enabled?: boolean;
	userDataDirectory?: UserDataDirectoryServicePort;
	openClaw?: OpenClawCronSchedulerOptions;
}

/**
 * Schedules and manages recurring jobs via node-cron. Tasks are persisted
 * to StoreService so they survive app restart, and reloaded via restore().
 *
 * Generic over the data payload: callers parameterize schedule<TData>() with
 * whatever shape they want as long as it has a string `type` discriminator.
 */
export class CronService implements Disposable {
	private readonly store: StoreService;
	private readonly logger: LoggerService;
	private readonly jobs = new Map<string, RegisteredJob>();
	private readonly scheduleStore: ElectronStoreCronScheduleStore;
	private readonly scheduler: CronSchedulerService;
	private readonly openClaw: OpenClawCronScheduler;
	private readonly automaticEnabled: boolean;

	constructor(
		store: StoreService,
		logger: LoggerService,
		taskManager?: CronTaskManagerPort,
		options: CronServiceOptions = {}
	) {
		this.store = store;
		this.logger = logger;
		this.automaticEnabled =
			options.enabled ?? (process.env.SKIP_CRON !== '1' && process.env.CRON_ENABLED !== 'false');
		this.scheduleStore = new ElectronStoreCronScheduleStore(store);
		const runner = new TaskManagerCronScheduleRunner(taskManager ?? new StoreBackedCronTaskManager());
		const accessPolicy = new DefaultCronScheduleAccessPolicy({
			minIntervalMs: DEFAULT_CRON_RUN_POLICY.minIntervalMs,
			highFrequencyThresholdMs: DEFAULT_CRON_RUN_POLICY.highFrequencyThresholdMs,
			maxActiveSchedulesPerUser: 250,
		});
		this.scheduler = new CronSchedulerService(
			this.scheduleStore,
			runner,
			accessPolicy,
			{},
			logger,
			new CronConfirmationManager()
		);
		const openClawRoot = options.userDataDirectory?.resolve('cron') ?? resolveDefaultUserDataPath('cron');
		this.openClaw = new OpenClawCronScheduler(
			new FileOpenClawCronStore(openClawRoot),
			new NoopOpenClawCronExecutor(),
			new NoopOpenClawCronDelivery(),
			{
				...options.openClaw,
				enabled: this.automaticEnabled,
			},
			logger
		);
	}

	get events(): CronSchedulerService['events'] {
		return this.scheduler.events;
	}

	async start(): Promise<void> {
		if (!this.automaticEnabled) {
			this.logger.warn('CronService', 'Cron automatic execution is globally disabled.');
			await this.openClaw.start();
			return;
		}
		await this.scheduler.start();
		await this.openClaw.start();
	}

	async stop(): Promise<void> {
		await this.scheduler.stop();
		await this.openClaw.stop();
	}

	async reload(): Promise<void> {
		await this.scheduler.reload();
		if (this.automaticEnabled) await this.openClaw.recoverStartup();
	}

	configureOpenClawRuntime(dependencies: {
		agentService?: AgentService;
		eventBus?: EventBus;
		channelRegistry?: ChannelRegistry;
	}): void {
		if (dependencies.agentService) {
			this.openClaw.setExecutor(new AgentServiceOpenClawCronExecutor(dependencies.agentService));
		}
		this.openClaw.setDelivery(
			new GatewayOpenClawCronDelivery({
				eventBus: dependencies.eventBus,
				channelRegistry: dependencies.channelRegistry,
				logger: this.logger,
			})
		);
	}

	openClawAction(
		request: OpenClawCronToolRequest,
		actor?: OpenClawCronActor
	): Promise<OpenClawCronToolResponse> {
		return this.openClaw.handleToolAction(request, actor);
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

	runScheduleNow(scheduleId: string, actor?: CronActorContext): ReturnType<CronSchedulerService['runScheduleNow']> {
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

	getNextRuns(scheduleId: string, count: number, actor?: CronActorContext): Promise<CronNextRunPreview> {
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
			this.logger.warn('CronService', `Saved job "${id}" while cron automatic execution is disabled`);
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
			this.logger.warn('CronService', 'Cron restore skipped because automatic execution is disabled');
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
		void this.openClaw.stop();
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
