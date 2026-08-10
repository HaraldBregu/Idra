import { runScheduleNow } from '../../../tasks';
import { tool } from '../tool';
import { scheduleIdSchema } from './schema';

export const runScheduleNowTool = tool({
	name: 'run_schedule_now',
	defaultPermission: 'allow',
	risk: 'high',
	effect: 'execute',
	description: 'Trigger a tasks schedule to run immediately by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => runScheduleNow(scheduleId),
});
