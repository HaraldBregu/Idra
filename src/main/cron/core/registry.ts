import type {
	CronSchedule,
	CronScheduleCreateRequest,
	CronScheduleFilter,
	CronScheduledTask,
} from './types';

export type CronFunctionId =
	| 'create_schedule'
	| 'pause_schedule'
	| 'resume_schedule'
	| 'delete_schedule'
	| 'get_schedule'
	| 'list_schedules'
	| 'run_schedule_now';

export interface CronFunctionDefinition {
	id: CronFunctionId;
	name: string;
	description: string;
}

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

export const CRON_FUNCTIONS: CronFunctionDefinition[] = [
	{
		id: 'create_schedule',
		name: 'Create schedule',
		description: 'Create a new cron schedule from a schedule request.',
	},
	{
		id: 'pause_schedule',
		name: 'Pause schedule',
		description: 'Pause an active schedule so it stops triggering.',
	},
	{
		id: 'resume_schedule',
		name: 'Resume schedule',
		description: 'Resume a paused schedule and recompute its next run.',
	},
	{
		id: 'delete_schedule',
		name: 'Delete schedule',
		description: 'Soft-delete a schedule and disable further runs.',
	},
	{
		id: 'get_schedule',
		name: 'Get schedule',
		description: 'Fetch a single schedule by id.',
	},
	{
		id: 'list_schedules',
		name: 'List schedules',
		description: 'List schedules matching an optional filter.',
	},
	{
		id: 'run_schedule_now',
		name: 'Run schedule now',
		description: 'Trigger a schedule immediately and create its task.',
	},
];
