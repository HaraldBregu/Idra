import { runScheduleNow } from '../../../app/tasks';
import { tool } from '../tool';
import { scheduleIdSchema } from './schema';

export const runScheduleNowTool = tool({
	name: 'run_schedule_now',
	description: 'Trigger a tasks schedule to run immediately by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => runScheduleNow(scheduleId),
});
