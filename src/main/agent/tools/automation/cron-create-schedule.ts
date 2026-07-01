import { createSchedule, type CronScheduleCreateRequest } from '../../cron';
import { BaseTool, type Context } from '../../types';
import { actionSchema } from './schema';

export class CreateScheduleTool extends BaseTool {
	readonly name = 'create_schedule';
	readonly description = 'Create a new cron schedule from a schedule definition request.';
	readonly schema = {
		type: 'object',
		properties: {
			request: {
				type: 'object',
				description: 'Schedule definition to create.',
				properties: {
					name: { type: 'string' },
					description: { type: 'string' },
					cronExpression: { type: 'string' },
					enabled: { type: 'boolean' },
					action: actionSchema,
				},
				required: ['name', 'action'],
				additionalProperties: false,
			},
		},
		required: ['request'],
		additionalProperties: false,
	};

	constructor(context: Context) {
		super(context);
	}

	run(input: Record<string, unknown>) {
		const request = input.request;
		if (!request || typeof request !== 'object' || Array.isArray(request)) {
			throw new Error('create_schedule requires a request object.');
		}
		return createSchedule(request as CronScheduleCreateRequest);
	}
}
