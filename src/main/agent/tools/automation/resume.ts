import { resumeSchedule } from '../../cron';
import { BaseTool, type Context } from '../../types';
import { requireScheduleId, scheduleIdSchema } from './schema';

export class ResumeScheduleTool extends BaseTool {
	readonly name = 'resume_schedule';
	readonly description = 'Resume a paused cron schedule by id.';
	readonly schema = scheduleIdSchema;

	constructor(context: Context) {
		super(context);
	}

	run(input: Record<string, unknown>): void {
		resumeSchedule(requireScheduleId(input, 'resume_schedule'));
	}
}
