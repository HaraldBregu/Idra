import { updateSchedule } from '../../../tasks';
import { tool } from '../tool';
import { scheduleIdSchema, updateScheduleRequestSchema } from './schema';

export const updateScheduleTool = tool({
	name: 'update_schedule',
	risk: 'high',
	effect: 'persistence',
	hardApproval: true,
	description: 'Update an existing tasks schedule by id.',
	inputSchema: scheduleIdSchema.extend({
		request: updateScheduleRequestSchema.describe('Fields to update on the schedule.'),
	}),
	execute: ({ scheduleId, request }) => updateSchedule(scheduleId, request),
});
