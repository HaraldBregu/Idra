import { resumeSchedule } from '../../../tasks';
import { tool } from '../tool';
import { scheduleIdSchema } from './schema';

export const resumeScheduleTool = tool({
	name: 'resume_schedule',
	defaultPermission: 'allow',
	risk: 'high',
	effect: 'persistence',
	hardApproval: true,
	description: 'Resume a paused tasks schedule by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => {
		resumeSchedule(scheduleId);
	},
});
