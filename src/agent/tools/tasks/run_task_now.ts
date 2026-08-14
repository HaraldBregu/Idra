import { runTaskNow } from '../../../tasks';
import { tool } from '../tool';
import { taskIdSchema } from './schema';

export const runTaskNowTool = tool({
	id: 'run_task_now',
	name: 'Run task now',
	description: 'Trigger a task to run immediately by id.',
	inputSchema: taskIdSchema,
	execute: ({ taskId }) => runTaskNow(taskId),
});
