import { runScheduleNow } from '../../../app/cron';
import { tool } from '../tool';
import { scheduleIdSchema } from './schema';

export const runScheduleNowTool = tool({
	name: 'run_schedule_now',
	description: 'Trigger a cron schedule to run immediately by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => runScheduleNow(scheduleId),
});
