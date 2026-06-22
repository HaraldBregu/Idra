export type CronStoredTarget = 'job' | 'tool' | 'task' | 'agent' | string;

export interface CronJobInfo {
	readonly id: string;
	readonly name: string;
	readonly description?: string;
	readonly expression: string;
	readonly enabled: boolean;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export type CronScheduleEventType =
	| 'schedule.created'
	| 'schedule.updated'
	| 'schedule.paused'
	| 'schedule.resumed'
	| 'schedule.deleted'
	| 'schedule.loaded'
	| 'schedule.recovered'
	| 'schedule.due'
	| 'schedule.triggered'
	| 'schedule.skipped'
	| 'schedule.missed'
	| 'schedule.failed'
	| 'schedule.completed'
	| 'schedule.permissionDenied'
	| 'schedule.nextRunUpdated';

export type CronTaskPriority = 'low' | 'normal' | 'high' | 'critical';

export type CronScheduledTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type CronJsonValue =
	| string
	| number
	| boolean
	| null
	| CronJsonValue[]
	| { [key: string]: CronJsonValue };

export interface CronScheduledTask {
	id: string;
	type: string;
	title: string;
	description?: string;
	createdAt: string;
	updatedAt: string;
}

export interface CronSchedule {
	id: string;
	name: string;
	description?: string;
	sessionId?: string;
	cronExpression?: string;
	target?: CronStoredTarget;
	taskType: string;
	enabled: boolean;
	updatedAt: string;
}

export interface CronScheduleCreateRequest {
	name: string;
	description?: string;
	sessionId?: string;
	cronExpression?: string;
	target?: CronStoredTarget;
	taskType: string;
	enabled?: boolean;
}

export interface CronScheduleFilter {
	sessionId?: string;
	taskType?: string;
	limit?: number;
}

export interface CronScheduleEvent {
	eventId: string;
	scheduleId: string;
	type: CronScheduleEventType;
	timestamp: string;
	message: string;
}

/** Shape persisted to the cron electron-store settings file. */
export interface PersistedCronState {
	enabled?: boolean;
	schedules: CronSchedule[];
}

export type CronFunctionId =
	| 'create_schedule'
	| 'pause_schedule'
	| 'resume_schedule'
	| 'delete_schedule'
	| 'get_schedule'
	| 'list_schedules'
	| 'run_schedule_now';

export interface CronFunctionInput {
	create_schedule: { request: CronScheduleCreateRequest };
	pause_schedule: { scheduleId: string };
	resume_schedule: { scheduleId: string };
	delete_schedule: { scheduleId: string };
	get_schedule: { scheduleId: string };
	list_schedules: { filter?: CronScheduleFilter };
	run_schedule_now: { scheduleId: string };
}

export interface CronFunctionResult {
	create_schedule: CronSchedule;
	pause_schedule: void;
	resume_schedule: void;
	delete_schedule: void;
	get_schedule: CronSchedule;
	list_schedules: CronSchedule[];
	run_schedule_now: CronScheduledTask;
}
