import { CronTool, requireString } from './base';

export class CronPauseScheduleTool extends CronTool {
	readonly name = 'cron_pause_schedule';
	readonly description = 'Pause a durable schedule so it stops firing until resumed.';
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
		await this.service.pauseSchedule(scheduleId);
		return { scheduleId, status: 'paused' };
	}
}
