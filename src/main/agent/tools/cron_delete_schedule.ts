import { deleteSchedule } from '../../cron';
import { tool } from './tool';
import { scheduleIdSchema } from './cron_schema';

export const deleteScheduleTool = tool({
	name: 'delete_schedule',
	description: 'Delete a cron schedule by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => {
		deleteSchedule(scheduleId);
	},
});
