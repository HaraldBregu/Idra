import { pauseTask } from '../../../tasks';
import { tool } from '../tool';
import { taskIdSchema } from './schema';

export const pauseTaskTool = tool({
	name: 'pause_task',
	description: 'Pause an active task by id.',
	inputSchema: taskIdSchema,
	execute: ({ taskId }) => {
		pauseTask(taskId);
	},
});
