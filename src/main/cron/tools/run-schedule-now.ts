import { CronTool, requireString } from '../core/base';

export class CronRunScheduleNowTool extends CronTool {
	readonly name = 'cron_run_schedule_now';
	readonly description = 'Trigger a durable schedule to run immediately, off its normal cadence.';
	readonly schema = {
		type: 'object',
		properties: {
			scheduleId: { type: 'string', description: 'The schedule id.' },
		},
		required: ['scheduleId'],
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>) {
		return this.service.runScheduleNow(requireString(input, 'scheduleId'));
	}
}
