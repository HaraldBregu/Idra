import { resumeSchedule } from '../../../tasks';
import { tool } from '../tool';
import { scheduleIdSchema } from './schema';

export const resumeScheduleTool = tool({
	name: 'resume_schedule',
	description: 'Resume a paused tasks schedule by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => {
		resumeSchedule(scheduleId);
	},
});
