import { pauseSchedule } from '../../cron';
import { BaseTool, type Context } from '../../types';
import { requireScheduleId, scheduleIdSchema } from './cron-schema';

export class PauseScheduleTool extends BaseTool {
	readonly name = 'pause_schedule';
	readonly description = 'Pause an active cron schedule by id.';
	readonly schema = scheduleIdSchema;

	constructor(context: Context) {
		super(context);
	}

	run(input: Record<string, unknown>): void {
		pauseSchedule(requireScheduleId(input, 'pause_schedule'));
	}
}
