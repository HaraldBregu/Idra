import type {
	CronSchedule,
	CronScheduleCreateRequest,
	CronScheduleFilter,
	CronScheduledTask,
} from './types';

export type CronFunctionId =
	| 'createSchedule'
	| 'pauseSchedule'
	| 'resumeSchedule'
	| 'deleteSchedule'
	| 'getSchedule'
	| 'listSchedules'
	| 'runScheduleNow';

export interface CronFunctionDefinition {
	id: CronFunctionId;
	name: string;
	description: string;
}

export interface CronFunctionInput {
	createSchedule: { request: CronScheduleCreateRequest };
	pauseSchedule: { scheduleId: string };
	resumeSchedule: { scheduleId: string };
	deleteSchedule: { scheduleId: string };
	getSchedule: { scheduleId: string };
	listSchedules: { filter?: CronScheduleFilter };
	runScheduleNow: { scheduleId: string };
}

export interface CronFunctionResult {
	createSchedule: CronSchedule;
	pauseSchedule: void;
	resumeSchedule: void;
	deleteSchedule: void;
	getSchedule: CronSchedule;
	listSchedules: CronSchedule[];
	runScheduleNow: CronScheduledTask;
}

export const CRON_FUNCTIONS: CronFunctionDefinition[] = [
	{
		id: 'createSchedule',
		name: 'Create schedule',
		description: 'Create a new cron schedule from a schedule request.',
	},
	{
		id: 'pauseSchedule',
		name: 'Pause schedule',
		description: 'Pause an active schedule so it stops triggering.',
	},
	{
		id: 'resumeSchedule',
		name: 'Resume schedule',
		description: 'Resume a paused schedule and recompute its next run.',
	},
	{
		id: 'deleteSchedule',
		name: 'Delete schedule',
		description: 'Soft-delete a schedule and disable further runs.',
	},
	{
		id: 'getSchedule',
		name: 'Get schedule',
		description: 'Fetch a single schedule by id.',
	},
	{
		id: 'listSchedules',
		name: 'List schedules',
		description: 'List schedules matching an optional filter.',
	},
	{
		id: 'runScheduleNow',
		name: 'Run schedule now',
		description: 'Trigger a schedule immediately and create its task.',
	},
];
