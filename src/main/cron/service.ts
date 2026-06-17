import {
	type CronExecutionRecord,
	type CronJobInfo,
	type CronSchedule,
	type CronScheduleCreateRequest,
	type CronScheduleEvent,
	type CronScheduleEventType,
	type CronScheduleFilter,
	type CronScheduledTask,
	type CronTask,
	type CronTaskData,
} from '../../shared/app/cron';
import type { CronNextRunPreview, CronScheduleUpdateRequest } from './types';
import type { CronData } from '../agent/core/cron-data';
import type { CronActorContext, CronScheduleStore } from './core/types';
import type { CronConfigurationStore, CronServiceConfiguration } from './core/config';
import type { CronLogger } from './core/logger';
import type { CronJobOptions } from './types';
import { ElectronStoreCronScheduleStore } from './adapters/store';
import { ElectronStoreCronConfigurationStore } from './adapters/config';
import { InMemoryCronScheduleRunner } from './adapters/runner';
import { CronSchedulerEngine } from './engine/scheduler';
import { resolveCronServiceConfiguration } from './core/config';
import { NodeCronJobRegistry } from './adapters/registry';

interface Disposable {
	destroy(): void | Promise<void>;
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
	configurationStore?: CronConfigurationStore;
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
	private readonly scheduleStore: CronScheduleStore;
	private readonly configurationStore: CronConfigurationStore;
	private readonly configuration: CronServiceConfiguration;
	private readonly scheduler: CronSchedulerEngine;
	private readonly jobRegistry: NodeCronJobRegistry;
	private readonly automaticEnabled: boolean;

	constructor(logger: CronLogger, options: CronServiceOptions = {}) {
		this.logger = logger;
		this.configurationStore =
			options.configurationStore ?? new ElectronStoreCronConfigurationStore();
		this.configuration = resolveCronServiceConfiguration(
			this.configurationStore.readConfiguration(),
			{ enabled: options.enabled }
		);
		this.configurationStore.writeConfiguration(this.configuration);
		this.automaticEnabled = this.configuration.enabled;
		this.scheduleStore = options.scheduleStore ?? new ElectronStoreCronScheduleStore();
		this.jobRegistry = new NodeCronJobRegistry(logger, this.automaticEnabled);
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

	getConfiguration(): CronServiceConfiguration {
		return { ...this.configuration };
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
		return this.jobRegistry.schedule(id, expression, data, handler, options);
	}

	unschedule(id: string): void {
		this.jobRegistry.unschedule(id);
	}

	deleteJob(id: string): void {
		this.jobRegistry.unschedule(id);
	}

	listJobs(): CronJobInfo[] {
		return this.jobRegistry.listJobs();
	}

	has(id: string): boolean {
		return this.jobRegistry.has(id);
	}

	destroy(): void {
		void this.scheduler.stop();
		this.jobRegistry.destroy();
		this.logger.info('CronService', 'Disposed');
	}
}
