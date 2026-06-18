import type { JSONSchema, ProviderToolSpec } from '../../llm/types';
import { CRON_FUNCTIONS, type CronFunctionId } from './registry';

const scheduleIdSchema: JSONSchema = {
	type: 'object',
	properties: {
		scheduleId: { type: 'string', description: 'Identifier of the target schedule.' },
	},
	required: ['scheduleId'],
};

const CRON_FUNCTION_SCHEMAS: Record<CronFunctionId, JSONSchema> = {
	create_schedule: {
		type: 'object',
		properties: {
			request: { type: 'object', description: 'Schedule creation request.' },
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
