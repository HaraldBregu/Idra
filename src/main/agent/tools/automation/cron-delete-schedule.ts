import { deleteSchedule } from '../../cron';
import { tool } from '../../shared/tool';
import { scheduleIdSchema } from './cron-schema';

export const deleteScheduleTool = tool({
	name: 'delete_schedule',
	description: 'Delete a cron schedule by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => {
		deleteSchedule(scheduleId);
	},
});
