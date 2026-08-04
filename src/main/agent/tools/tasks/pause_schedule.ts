import { pauseSchedule } from '../../../app/cron';
import { tool } from '../tool';
import { scheduleIdSchema } from './schema';

export const pauseScheduleTool = tool({
	name: 'pause_schedule',
	description: 'Pause an active cron schedule by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => {
		pauseSchedule(scheduleId);
	},
});
