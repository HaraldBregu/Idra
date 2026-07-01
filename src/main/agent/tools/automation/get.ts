import { getSchedule } from '../../cron';
import { BaseTool, type Context } from '../../types';
import { requireScheduleId, scheduleIdSchema } from './schema';

export class GetScheduleTool extends BaseTool {
	readonly name = 'get_schedule';
	readonly description = 'Fetch a single cron schedule by id.';
	readonly schema = scheduleIdSchema;

	constructor(context: Context) {
		super(context);
	}

	run(input: Record<string, unknown>) {
		return getSchedule(requireScheduleId(input, 'get_schedule'));
	}
}
