import { updateSchedule } from '../../cron';
import { tool } from '../../tool';
import { z } from 'zod';
import { scheduleIdSchema, updateScheduleRequestSchema } from './cron-schema';

export const updateScheduleTool = tool({
	name: 'update_schedule',
	description: 'Update an existing cron schedule by id.',
	inputSchema: scheduleIdSchema.extend({
		request: updateScheduleRequestSchema.describe('Fields to update on the schedule.'),
	}),
	execute: ({ scheduleId, request }) => updateSchedule(scheduleId, request),
});
