import cron from 'node-cron';
import type { Disposable } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { ChannelRegistry } from '../channels';
import type { AgentService } from '../service';
import type { HeartbeatService } from '../heartbeat';
import type { TasksService } from '../tasks';
import {
	isCronTaskData,
	type CronExecutionRecord,
	type FridayCronActionRequest,
	type FridayCronActionResponse,
	type CronNextRunPreview,
	type CronSchedule,
	type CronScheduleCreateRequest,
	type CronScheduleEvent,
	type CronScheduleEventType,
	type CronScheduleFilter,
	type CronScheduleUpdateRequest,
	type CronScheduledTask,
	type CronStoredRunStatus,
	type CronStoredSchedule,
	type CronStoredTarget,
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
import { ElectronStoreFridayCronStore } from './workflow/store';
import {
	GatewayFridayCronDelivery,
	AgentServiceFridayCronExecutor,
	TaskManagerFridayCronExecutor,
} from './workflow/runtime-adapters';
import {
	NoopFridayCronDelivery,
	NoopFridayCronExecutor,
	FridayCronScheduler,
	type FridayCronActor,
} from './workflow/scheduler';
import type { FridayCronNormalizeContext } from './workflow/normalize';

export type CronServiceEventListener = (event: CronScheduleEvent) => void;

export interface CronServiceEvents {
	subscribe(listener: CronServiceEventListener): () => void;
	subscribeToType(type: CronScheduleEventType, listener: CronServiceEventListener): () => void;
}

export type CronServiceActor = CronActorContext;
export type CronServiceStore = CronPersistenceStore;
export type CronServiceActionActor = FridayCronActor;
export type CronServiceActionRequest = FridayCronActionRequest;
export type CronServiceActionResponse = FridayCronActionResponse;
export type { CronJobOptions, CronTaskHandler } from './types';

interface NextRunCapable {
	getNextRun?: () => Date | null;
}

interface CronModelSelectionStore {
	getAgentService(): { provider: { id: string }; model: { id: string } } | undefined;
}

export interface CronServiceOptions {
	enabled?: boolean;
	store?: CronServiceStore;
	settingsStore?: CronModelSelectionStore;
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
	private readonly workflow: FridayCronScheduler;
	private readonly automaticEnabled: boolean;
	private readonly settingsStore?: CronModelSelectionStore;
	private taskManager?: TasksService;

	constructor(logger: LoggerService, options: CronServiceOptions = {}) {
		this.store = options.store ?? new ElectronStoreCronStore();
		this.logger = logger;
		this.settingsStore = options.settingsStore;
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
		this.workflow = new FridayCronScheduler(
			new ElectronStoreFridayCronStore(this.store),
			new NoopFridayCronExecutor(),
			new NoopFridayCronDelivery(),
			{
				enabled: this.automaticEnabled,
			},
			logger
		);
	}

	configureTaskRuntime(dependencies: { taskManager: TasksService }): void {
		this.taskManager = dependencies.taskManager;
		this.runner.setDelegate(new TaskManagerCronScheduleRunner(dependencies.taskManager));
	}

	get events(): CronServiceEvents {
		return this.scheduler.events;
	}

	async start(): Promise<void> {
		if (!this.automaticEnabled) {
			this.logger.warn('CronService', 'Cron automatic execution is globally disabled.');
			await this.workflow.start();
			this.logger.info('CronService', 'Cron service started with automatic execution disabled.');
			return;
		}
		await this.scheduler.start();
		await this.workflow.start();
		this.logger.info('CronService', 'Cron service started.');
	}

	async stop(): Promise<void> {
		await this.scheduler.stop();
		await this.workflow.stop();
		this.logger.info('CronService', 'Cron service stopped.');
	}

	async reload(): Promise<void> {
		this.logger.info('CronService', 'Cron service reload requested.');
		await this.scheduler.reload();
		if (this.automaticEnabled) await this.workflow.recoverStartup();
	}

	configureRuntime(dependencies: {
		agentService?: AgentService;
		eventBus?: EventBus;
		channelRegistry?: ChannelRegistry;
		heartbeat?: HeartbeatService;
	}): void {
		this.logger.info('CronService', 'Cron runtime configured.', {
			hasAgentService: Boolean(dependencies.agentService),
			hasEventBus: Boolean(dependencies.eventBus),
			hasChannelRegistry: Boolean(dependencies.channelRegistry),
			hasHeartbeat: Boolean(dependencies.heartbeat),
		});
		const directExecutor = dependencies.agentService
			? new AgentServiceFridayCronExecutor(dependencies.agentService, dependencies.heartbeat)
			: undefined;
		if (dependencies.agentService) {
			this.workflow.setExecutor(
				this.taskManager && dependencies.eventBus
					? new TaskManagerFridayCronExecutor(
							this.taskManager,
							dependencies.eventBus,
							directExecutor!
						)
					: directExecutor!
			);
		}
		this.workflow.setDelivery(
			new GatewayFridayCronDelivery({
				eventBus: dependencies.eventBus,
				channelRegistry: dependencies.channelRegistry,
				logger: this.logger,
			})
		);
	}

	handleAction(
		request: CronServiceActionRequest,
		actor?: CronServiceActionActor,
		context: Omit<FridayCronNormalizeContext, 'actor'> = {}
	): Promise<CronServiceActionResponse> {
		const effectiveActor = actor ?? { role: 'owner' as const };
		return this.workflow.handleAction(request, effectiveActor, context);
	}

	createSchedule(
		request: CronScheduleCreateRequest,
		actor?: CronActorContext
	): Promise<CronSchedule> {
		return this.scheduler.createSchedule(this.withConfiguredModel(request), actor);
	}

	updateSchedule(
		scheduleId: string,
		patch: CronScheduleUpdateRequest,
		actor?: CronActorContext
	): Promise<CronSchedule> {
		return this.scheduler.updateSchedule(scheduleId, this.withConfiguredModel(patch), actor);
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

		const configuredModel = this.configuredModel();
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
			providerId: options.providerId ?? configuredModel?.providerId,
			modelId: options.modelId ?? configuredModel?.modelId,
			target: options.target ?? this.targetForData(data),
			payload: data,
			data,
			createdAt: now,
			updatedAt: now,
			runCount: 0,
			failureCount: 0,
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
				try {
					await handler();
					this.recordRunResult(id, 'success');
					this.logger.info('CronService', `Job "${id}" completed`);
				} catch (err) {
					this.recordRunResult(id, 'failure', this.errorMessage(err));
					this.logger.error('CronService', `Job "${id}" failed`, err);
				}
			},
			{ timezone: options.timezone }
		);

		this.jobs.set(id, { id, expression, timezone: options.timezone, task });
		this.persistTask(record);
		this.logger.info('CronService', `Scheduled job "${id}" with "${expression}"`);

		if (options.runOnStart) {
			void Promise.resolve(handler())
				.then(() => {
					this.recordRunResult(id, 'success');
					this.logger.info('CronService', `Initial run of "${id}" completed`);
				})
				.catch((err) => {
					this.recordRunResult(id, 'failure', this.errorMessage(err));
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
					try {
						await dispatcher(task);
						this.recordRunResult(task.id, 'success');
						this.logger.info('CronService', `Restored job "${task.id}" completed`);
					} catch (err) {
						this.recordRunResult(task.id, 'failure', this.errorMessage(err));
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
			if (!next) return { ...t };
			const nextRunAt = next.toISOString();
			return { ...t, nextRunAt, nextRun: nextRunAt };
		});
	}

	has(id: string): boolean {
		return this.jobs.has(id);
	}

	destroy(): void {
		void this.scheduler.stop();
		void this.workflow.stop();
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

	private recordRunResult(id: string, status: CronStoredRunStatus, error?: string): void {
		const tasks = this.migrateTasks(this.store.getCronTasks());
		const idx = tasks.findIndex((t) => t.id === id);
		if (idx === -1) return;
		const now = new Date().toISOString();
		const task = tasks[idx];
		tasks[idx] = {
			...task,
			updatedAt: now,
			lastRunAt: now,
			lastRun: now,
			lastRunStatus: status,
			lastError: status === 'failure' ? error : undefined,
			runCount: status === 'success' ? task.runCount + 1 : task.runCount,
			failureCount: status === 'failure' ? task.failureCount + 1 : task.failureCount,
		};
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
				: isCronTaskData(r.payload)
					? r.payload
					: typeof r.message === 'string'
						? { type: 'message' as const, message: r.message }
						: null;
			if (!data) continue;
			const createdAt =
				typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString();
			const lastRunAt =
				typeof r.lastRunAt === 'string'
					? r.lastRunAt
					: typeof r.lastRun === 'string'
						? r.lastRun
						: undefined;
			const runCount =
				typeof r.runCount === 'number' && Number.isFinite(r.runCount)
					? Math.max(0, Math.floor(r.runCount))
					: lastRunAt
						? 1
						: 0;
			const failureCount =
				typeof r.failureCount === 'number' && Number.isFinite(r.failureCount)
					? Math.max(0, Math.floor(r.failureCount))
					: 0;
			out.push({
				id: r.id,
				name: typeof r.name === 'string' && r.name.trim() ? r.name : r.id,
				description: typeof r.description === 'string' ? r.description : undefined,
				schedule: this.scheduleValue(r.schedule, r.expression),
				expression: r.expression,
				timezone: typeof r.timezone === 'string' ? r.timezone : 'UTC',
				enabled: typeof r.enabled === 'boolean' ? r.enabled : true,
				status: this.scheduleStatus(r.status, r.enabled),
				providerId: typeof r.providerId === 'string' ? r.providerId : undefined,
				modelId: typeof r.modelId === 'string' ? r.modelId : undefined,
				target: typeof r.target === 'string' ? r.target : this.targetForData(data),
				payload: data,
				data,
				createdAt,
				updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : createdAt,
				lastRunAt,
				nextRunAt: typeof r.nextRunAt === 'string' ? r.nextRunAt : undefined,
				lastRunStatus: this.runStatus(r.lastRunStatus),
				lastError: typeof r.lastError === 'string' ? r.lastError : undefined,
				runCount,
				failureCount,
				lastRun: lastRunAt,
			});
		}
		return out;
	}

	private configuredModel(): { providerId: string; modelId: string } | undefined {
		const selection = this.settingsStore?.getAgentService();
		if (!selection) return undefined;
		return { providerId: selection.provider.id, modelId: selection.model.id };
	}

	private withConfiguredModel<T extends CronScheduleCreateRequest | CronScheduleUpdateRequest>(
		request: T
	): T {
		const configuredModel = this.configuredModel();
		if (!configuredModel) return request;
		return {
			...request,
			providerId: request.providerId ?? configuredModel.providerId,
			modelId: request.modelId ?? configuredModel.modelId,
		};
	}

	private targetForData(data: CronTaskData): CronStoredTarget {
		if (data.type === 'agent') return 'agent';
		if (data.type === 'tool') return 'tool';
		if (data.type === 'task') return 'task';
		return 'job';
	}

	private scheduleValue(value: unknown, expression: unknown): CronStoredSchedule {
		if (typeof value === 'string') return value;
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			return value as CronStoredSchedule;
		}
		return typeof expression === 'string' ? expression : '';
	}

	private scheduleStatus(value: unknown, enabled: unknown): CronSchedule['status'] {
		if (
			value === 'active' ||
			value === 'paused' ||
			value === 'disabled' ||
			value === 'expired' ||
			value === 'completed' ||
			value === 'failed' ||
			value === 'deleted'
		) {
			return value;
		}
		return enabled === false ? 'disabled' : 'active';
	}

	private runStatus(value: unknown): CronStoredRunStatus | undefined {
		return value === 'success' || value === 'failure' || value === 'skipped' ? value : undefined;
	}

	private errorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}
}
