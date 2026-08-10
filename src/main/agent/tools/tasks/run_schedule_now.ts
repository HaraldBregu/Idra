import { runScheduleNow } from '../../../tasks';
import { tool } from '../tool';
import { scheduleIdSchema } from './schema';
import { taskStorePath } from '../../../tasks/tasks_store';
import { realPath } from '../../../shared/real_path';

export const runScheduleNowTool = tool({
	name: 'run_schedule_now',
	defaultPermission: 'allow',
	risk: 'high',
	effect: 'execute',
	exclusiveTargets: () => [realPath(taskStorePath)],
	description: 'Trigger a tasks schedule to run immediately by id.',
	inputSchema: scheduleIdSchema,
	execute: ({ scheduleId }) => runScheduleNow(scheduleId),
});
