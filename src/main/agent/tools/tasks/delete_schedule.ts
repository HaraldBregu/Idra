import { deleteSchedule } from '../../../tasks';
import { tool } from '../tool';
import { scheduleIdSchema } from './schema';

export const deleteScheduleTool = tool({
	name: 'delete_schedule',
	risk: 'critical',
	effect: 'persistence',
	hardApproval: true,
	description: 'Delete a tasks schedule by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => {
		deleteSchedule(scheduleId);
	},
});
