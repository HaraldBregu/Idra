import type { JSONSchema, ProviderToolSpec } from '../../llm/types';
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

const scheduleIdSchema: JSONSchema = {
	type: 'object',
	properties: {
		scheduleId: { type: 'string', description: 'Identifier of the target schedule.' },
	},
	required: ['scheduleId'],
};

export const CRON_FUNCTION_SCHEMAS: Record<CronFunctionId, JSONSchema> = {
	create_schedule: {
		type: 'object',
		properties: {
			request: {
				type: 'object',
				description: 'Schedule creation request.',
				properties: {
					name: { type: 'string', description: 'Human-readable name for the schedule.' },
					description: {
						type: 'string',
						description: 'Optional description of what the schedule does.',
					},
					type: {
						type: 'string',
						enum: ['cron', 'interval', 'fixedRate', 'fixedDelay', 'oneTime', 'calendar', 'manual'],
						description:
							'Scheduling strategy. Use "cron" with cronExpression, "interval" with intervalMs, or "oneTime" with runAt.',
					},
					cronExpression: {
						type: 'string',
						description: 'Cron expression (e.g. "0 9 * * *"). Required when type is "cron".',
					},
					intervalMs: {
						type: 'number',
						description:
							'Interval in milliseconds. Required when type is "interval", "fixedRate", or "fixedDelay".',
					},
					runAt: {
						type: 'string',
						description: 'ISO timestamp for a single run. Required when type is "oneTime".',
					},
					startAt: {
						type: 'string',
						description: 'ISO timestamp before which the schedule will not run.',
					},
					endAt: {
						type: 'string',
						description: 'ISO timestamp after which the schedule stops running.',
					},
					timezone: {
						type: 'string',
						description: 'IANA timezone (e.g. "Europe/Rome"). Defaults to the system timezone.',
					},
					maxRuns: {
						type: 'number',
						description: 'Maximum number of times the schedule may run.',
					},
					taskType: {
						type: 'string',
						description: 'Identifier for the task to run when the schedule fires.',
					},
					taskInput: {
						description: 'Arbitrary input payload passed to the task when it runs.',
					},
					taskPriority: {
						type: 'string',
						enum: ['low', 'normal', 'high', 'critical'],
						description: 'Priority of the task spawned when the schedule fires.',
					},
				},
				required: ['name', 'type'],
			},
		},
		required: ['request'],
	},
	pause_schedule: scheduleIdSchema,
	resume_schedule: scheduleIdSchema,
	delete_schedule: scheduleIdSchema,
	get_schedule: scheduleIdSchema,
	list_schedules: {
		type: 'object',
		properties: {
			filter: { type: 'object', description: 'Optional filter applied to the schedule list.' },
		},
		required: [],
	},
	run_schedule_now: scheduleIdSchema,
};

export const CRON_TOOLS: ProviderToolSpec[] = CRON_FUNCTIONS.map((fn) => ({
	name: fn.id,
	description: fn.description,
	schema: CRON_FUNCTION_SCHEMAS[fn.id],
}));
