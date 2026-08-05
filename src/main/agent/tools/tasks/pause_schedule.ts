import { pauseSchedule } from '../../../tasks';
import { tool } from '../tool';
import { scheduleIdSchema } from './schema';

export const pauseScheduleTool = tool({
	name: 'pause_schedule',
	description: 'Pause an active tasks schedule by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => {
		pauseSchedule(scheduleId);
	},
});
