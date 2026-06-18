import type {
	CronActorContext,
	CronFunctionDefinition,
	CronFunctionId,
	CronFunctionInput,
	CronFunctionResult,
	CronJobInfo,
	CronSchedule,
	CronScheduleCreateRequest,
	CronScheduleEvent,
	CronScheduleFilter,
	CronScheduledTask,
} from '../../cron/core';

export interface CronEvents {
	subscribe(listener: (event: CronScheduleEvent) => void): () => void;
}

export abstract class Cron {
	abstract get events(): CronEvents;
	abstract get functions(): CronFunctionDefinition[];

	abstract start(): Promise<void>;
	abstract stop(): Promise<void>;
	abstract destroy(): void;

	abstract createSchedule(request: CronScheduleCreateRequest, actor?: CronActorContext): CronSchedule;
	abstract pauseSchedule(scheduleId: string, actor?: CronActorContext): void;
	abstract resumeSchedule(scheduleId: string, actor?: CronActorContext): void;
	abstract deleteSchedule(scheduleId: string, actor?: CronActorContext): void;
	abstract getSchedule(scheduleId: string, actor?: CronActorContext): CronSchedule;
	abstract listSchedules(filter?: CronScheduleFilter, actor?: CronActorContext): CronSchedule[];
	abstract runScheduleNow(scheduleId: string, actor?: CronActorContext): CronScheduledTask;

	abstract invoke<K extends CronFunctionId>(
		id: K,
		input: CronFunctionInput[K],
		actor?: CronActorContext
	): CronFunctionResult[K];

	abstract listJobs(): CronJobInfo[];
	abstract deleteJob(id: string): void;
}
