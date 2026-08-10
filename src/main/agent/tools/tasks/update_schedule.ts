import { updateSchedule } from '../../../tasks';
import { tool } from '../tool';
import { scheduleIdSchema, updateScheduleRequestSchema } from './schema';

export const updateScheduleTool = tool({
	name: 'update_schedule',
	defaultPermission: 'allow',
	risk: 'high',
	effect: 'persistence',
	description: 'Update an existing tasks schedule by id.',
	inputSchema: scheduleIdSchema.extend({
		request: updateScheduleRequestSchema.describe('Fields to update on the schedule.'),
	}),
	execute: ({ scheduleId, request }) => updateSchedule(scheduleId, request),
});
