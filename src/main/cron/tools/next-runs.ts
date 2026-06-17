import { CronTool, optionalNumber, requireString } from './base';

export class CronNextRunsTool extends CronTool {
	readonly name = 'cron_next_runs';
	readonly description = 'Preview the upcoming run times for a durable schedule.';
	readonly schema = {
		type: 'object',
		properties: {
			scheduleId: { type: 'string', description: 'The schedule id.' },
			count: { type: 'number', description: 'How many upcoming runs to return. Defaults to 5.' },
		},
		required: ['scheduleId'],
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>) {
		const scheduleId = requireString(input, 'scheduleId');
		const count = optionalNumber(input, 'count') ?? 5;
		return this.service.getNextRuns(scheduleId, count);
	}
}
