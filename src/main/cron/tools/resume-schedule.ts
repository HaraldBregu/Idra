import { CronTool, requireString } from '../core/base';

export class CronResumeScheduleTool extends CronTool {
	readonly name = 'cron_resume_schedule';
	readonly description = 'Resume a paused durable schedule.';
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
		await this.service.resumeSchedule(scheduleId);
		return { scheduleId, status: 'active' };
	}
}
