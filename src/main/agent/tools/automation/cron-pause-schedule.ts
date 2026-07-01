import { pauseSchedule } from '../../cron';
import { tool } from '../../shared/tool';
import { scheduleIdSchema } from './cron-schema';

export const pauseScheduleTool = tool({
	name: 'pause_schedule',
	description: 'Pause an active cron schedule by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => {
		pauseSchedule(scheduleId);
	},
});
