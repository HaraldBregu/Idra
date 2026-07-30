import type { ModelReasoningEffort } from '../../../shared/agent_types';

export interface CronJobInfo {
	readonly id: string;
	readonly name: string;
	readonly description?: string;
	readonly expression: string;
	readonly enabled: boolean;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface CronScheduledTask {
	id: string;
	title: string;
	description?: string;
	createdAt: string;
	updatedAt: string;
}

export type CronAction =
	| { type: 'debug'; message: string }
	| { type: 'agent'; prompt: string; effort: ModelReasoningEffort };

export interface CronSchedule {
	id: string;
	name: string;
	description?: string;
	cronExpression?: string;
	enabled: boolean;
	action: CronAction;
	createdAt: string;
	updatedAt: string;
}

export type CronScheduleCreateRequest = Omit<
	CronSchedule,
	'id' | 'createdAt' | 'updatedAt' | 'enabled'
> & {
	enabled?: boolean;
};

export type CronScheduleUpdateRequest = Partial<
	Omit<CronSchedule, 'id' | 'createdAt' | 'updatedAt'>
>;

export interface CronScheduleEvent {
	eventId: string;
	scheduleId: string;
	type:
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
	timestamp: string;
	message: string;
}

export interface CronRuntime {
	providerId: string;
	modelId: string;
}

/** Shape persisted to the cron electron-store file. */
export interface PersistedCronState {
	enabled?: boolean;
	runtime?: CronRuntime;
	schedules: CronSchedule[];
}

export const DEFAULT_CRON_STATE: PersistedCronState = { schedules: [] };

export type CronFunctionId =
	| 'create_schedule'
	| 'update_schedule'
	| 'pause_schedule'
	| 'resume_schedule'
	| 'delete_schedule'
	| 'get_schedule'
	| 'list_schedules'
	| 'run_schedule_now';

export interface CronFunctionInput {
	create_schedule: { request: CronScheduleCreateRequest };
	update_schedule: { scheduleId: string; request: CronScheduleUpdateRequest };
	pause_schedule: { scheduleId: string };
	resume_schedule: { scheduleId: string };
	delete_schedule: { scheduleId: string };
	get_schedule: { scheduleId: string };
	list_schedules: Record<string, never>;
	run_schedule_now: { scheduleId: string };
}

export interface CronFunctionResult {
	create_schedule: CronSchedule;
	update_schedule: CronSchedule;
	pause_schedule: void;
	resume_schedule: void;
	delete_schedule: void;
	get_schedule: CronSchedule;
	list_schedules: CronSchedule[];
	run_schedule_now: CronScheduledTask;
}

export interface CronEvents {
	subscribe(listener: (event: CronScheduleEvent) => void): () => void;
}

export type CronRunner = (schedule: CronSchedule) => Promise<unknown>;
