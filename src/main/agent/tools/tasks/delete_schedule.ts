import { deleteSchedule } from '../../../app/cron';
import { tool } from '../tool';
import { scheduleIdSchema } from './schema';

export const deleteScheduleTool = tool({
	name: 'delete_schedule',
	description: 'Delete a cron schedule by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => {
		deleteSchedule(scheduleId);
	},
});
