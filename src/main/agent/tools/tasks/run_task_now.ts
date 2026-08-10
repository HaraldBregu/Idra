import { runTaskNow } from '../../../tasks';
import { tool } from '../tool';
import { taskIdSchema } from './schema';
import { taskStorePath } from '../../../tasks/tasks_store';
import { realPath } from '../../../shared/real_path';

export const runTaskNowTool = tool({
	name: 'run_task_now',
	exclusiveTargets: () => [realPath(taskStorePath)],
	description: 'Trigger a task to run immediately by id.',
	inputSchema: taskIdSchema,
	execute: ({ taskId }) => runTaskNow(taskId),
});
