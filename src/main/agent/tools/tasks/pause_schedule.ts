import { pauseSchedule } from '../../../tasks';
import { tool } from '../tool';
import { scheduleIdSchema } from './schema';

export const pauseScheduleTool = tool({
	name: 'pause_schedule',
	defaultPermission: 'allow',
	risk: 'high',
	effect: 'persistence',
	hardApproval: true,
	allowedOrigins: ['main'],
	description: 'Pause an active tasks schedule by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => {
		pauseSchedule(scheduleId);
	},
});
