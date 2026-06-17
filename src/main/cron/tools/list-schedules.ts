import type { CronScheduleStatus } from '../../../shared/app/cron';
import { CronTool, optionalString } from './base';

export class CronListSchedulesTool extends CronTool {
	readonly name = 'cron_list_schedules';
	readonly description = 'List durable schedules, optionally filtered by status or task type.';
	readonly schema = {
		type: 'object',
		properties: {
			status: {
				type: 'string',
				enum: ['active', 'paused', 'disabled', 'expired', 'completed', 'failed'],
				description: 'Filter by schedule status.',
			},
			taskType: { type: 'string', description: 'Filter by task type.' },
		},
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>) {
		const status = optionalString(input, 'status') as CronScheduleStatus | undefined;
		const taskType = optionalString(input, 'taskType');
		return this.service.listSchedules({ status, taskType });
	}
}
