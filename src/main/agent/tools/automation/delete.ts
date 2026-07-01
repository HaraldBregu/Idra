import { deleteSchedule } from '../../cron';
import { BaseTool, type Context } from '../../types';
import { requireScheduleId, scheduleIdSchema } from './schema';

export class DeleteScheduleTool extends BaseTool {
	readonly name = 'delete_schedule';
	readonly description = 'Delete a cron schedule by id.';
	readonly schema = scheduleIdSchema;

	constructor(context: Context) {
		super(context);
	}

	run(input: Record<string, unknown>): void {
		deleteSchedule(requireScheduleId(input, 'delete_schedule'));
	}
}
