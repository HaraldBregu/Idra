import { getSchedule } from '../../../app/cron';
import { tool } from '../tool';
import { scheduleIdSchema } from './schema';

export const getScheduleTool = tool({
	name: 'get_schedule',
	description: 'Fetch a single cron schedule by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => getSchedule(scheduleId),
});
