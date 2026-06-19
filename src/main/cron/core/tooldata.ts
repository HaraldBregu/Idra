import type { JSONSchema, ProviderToolSpec } from '../../llm/types';
import { CRON_FUNCTIONS, type CronFunctionId } from './registry';

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
