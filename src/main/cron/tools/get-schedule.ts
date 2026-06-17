import { CronTool, requireString } from '../core/base';

export class CronGetScheduleTool extends CronTool {
	readonly name = 'cron_get_schedule';
	readonly description = 'Fetch a single durable schedule by id.';
	readonly schema = {
		type: 'object',
		properties: {
			scheduleId: { type: 'string', description: 'The schedule id.' },
		},
		required: ['scheduleId'],
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>) {
		return this.service.getSchedule(requireString(input, 'scheduleId'));
	}
}
