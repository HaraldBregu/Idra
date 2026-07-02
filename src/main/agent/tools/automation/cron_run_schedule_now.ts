import { runScheduleNow } from '../../cron';
import { tool } from '../../shared/tool';
import { scheduleIdSchema } from './cron_schema';

export const runScheduleNowTool = tool({
	name: 'run_schedule_now',
	description: 'Trigger a cron schedule to run immediately by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => runScheduleNow(scheduleId),
});
