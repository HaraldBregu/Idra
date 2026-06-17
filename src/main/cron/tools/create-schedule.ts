import type { CronJsonValue, CronScheduleType } from '../../../shared/app/cron';
import { CronTool, optionalNumber, optionalString, requireString } from '../core/base';

export class CronCreateScheduleTool extends CronTool {
	readonly name = 'cron_create_schedule';
	readonly description =
		'Create a durable recurring schedule. Provide either a cronExpression (for type "cron") or intervalMs (for type "interval"). The schedule fires the given taskType with taskInput.';
	readonly schema = {
		type: 'object',
		properties: {
			name: { type: 'string', description: 'Human-readable schedule name.' },
			description: { type: 'string', description: 'Optional description.' },
			type: {
				type: 'string',
				enum: ['cron', 'interval', 'oneTime'],
				description: 'Schedule type. Defaults to "cron".',
			},
			cronExpression: {
				type: 'string',
				description: 'Cron expression, e.g. "0 9 * * *". Required when type is "cron".',
			},
			intervalMs: {
				type: 'number',
				description: 'Interval in milliseconds. Required when type is "interval".',
			},
			runAt: {
				type: 'string',
				description: 'ISO timestamp for a one-time run. Required when type is "oneTime".',
			},
			timezone: { type: 'string', description: 'IANA timezone. Defaults to "UTC".' },
			taskType: { type: 'string', description: 'The task type to invoke on each run.' },
			taskInput: {
				type: 'object',
				description: 'Payload passed to the task on each run.',
			},
			enabled: { type: 'boolean', description: 'Whether the schedule starts enabled.' },
		},
		required: ['name', 'taskType'],
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>) {
		const type = (optionalString(input, 'type') ?? 'cron') as CronScheduleType;
		return this.service.createSchedule({
			name: requireString(input, 'name'),
			description: optionalString(input, 'description'),
			type,
			source: 'agent',
			createdBy: 'agent',
			timezone: optionalString(input, 'timezone') ?? 'UTC',
			cronExpression: optionalString(input, 'cronExpression'),
			intervalMs: optionalNumber(input, 'intervalMs'),
			runAt: optionalString(input, 'runAt'),
			taskType: requireString(input, 'taskType'),
			taskInput: (input.taskInput ?? null) as CronJsonValue,
			enabled: typeof input.enabled === 'boolean' ? input.enabled : undefined,
		});
	}
}
