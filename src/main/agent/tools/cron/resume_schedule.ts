import { resumeSchedule } from '../../../app/cron';
import { tool } from '../tool';
import { scheduleIdSchema } from './schema';

export const resumeScheduleTool = tool({
	name: 'resume_schedule',
	description: 'Resume a paused cron schedule by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => {
		resumeSchedule(scheduleId);
	},
});
