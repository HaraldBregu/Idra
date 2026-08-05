import { getSchedule } from '../../../tasks';
import { tool } from '../tool';
import { scheduleIdSchema } from './schema';

export const getScheduleTool = tool({
	name: 'get_schedule',
	description: 'Fetch a single tasks schedule by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => getSchedule(scheduleId),
});
