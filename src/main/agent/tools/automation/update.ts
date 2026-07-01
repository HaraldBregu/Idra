import {
	updateSchedule,
	type CronScheduleUpdateRequest,
} from '../../cron';
import { BaseTool, type Context } from '../../types';
import { actionSchema, requireScheduleId } from './schema';

export class UpdateScheduleTool extends BaseTool {
	readonly name = 'update_schedule';
	readonly description = 'Update an existing cron schedule by id.';
	readonly schema = {
		type: 'object',
		properties: {
			scheduleId: {
				type: 'string',
				description: 'Identifier of the schedule to update.',
			},
			request: {
				type: 'object',
				description: 'Fields to update on the schedule.',
				properties: {
					name: { type: 'string' },
					description: { type: 'string' },
					cronExpression: { type: 'string' },
					enabled: { type: 'boolean' },
					action: actionSchema,
				},
				additionalProperties: false,
			},
		},
		required: ['scheduleId', 'request'],
		additionalProperties: false,
	};

	constructor(context: Context) {
		super(context);
	}

	run(input: Record<string, unknown>) {
		const request = input.request;
		if (!request || typeof request !== 'object' || Array.isArray(request)) {
			throw new Error('update_schedule requires a request object.');
		}
		if (Object.keys(request).length === 0) {
			throw new Error('update_schedule requires at least one field in request.');
		}
		return updateSchedule(
			requireScheduleId(input, 'update_schedule'),
			request as CronScheduleUpdateRequest
		);
	}
}
