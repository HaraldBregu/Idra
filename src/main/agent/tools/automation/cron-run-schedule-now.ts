import { runScheduleNow } from '../../cron';
import { BaseTool, type Context } from '../../types';
import { requireScheduleId, scheduleIdSchema } from './cron-schema';

export class RunScheduleNowTool extends BaseTool {
	readonly name = 'run_schedule_now';
	readonly description = 'Trigger a cron schedule to run immediately by id.';
	readonly schema = scheduleIdSchema;

	constructor(context: Context) {
		super(context);
	}

	run(input: Record<string, unknown>) {
		return runScheduleNow(requireScheduleId(input, 'run_schedule_now'));
	}
}
