import { CronTool, requireString } from './base';

export class CronDeleteScheduleTool extends CronTool {
	readonly name = 'cron_delete_schedule';
	readonly description = 'Delete a durable schedule permanently.';
	readonly schema = {
		type: 'object',
		properties: {
			scheduleId: { type: 'string', description: 'The schedule id.' },
		},
		required: ['scheduleId'],
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>) {
		const scheduleId = requireString(input, 'scheduleId');
		await this.service.deleteSchedule(scheduleId);
		return { scheduleId, status: 'deleted' };
	}
}
