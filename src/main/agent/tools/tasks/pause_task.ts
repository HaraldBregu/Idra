import { pauseTask } from '../../../tasks';
import { tool } from '../tool';
import { taskIdSchema } from './schema';

export const pauseTaskTool = tool({
	id: 'pause_task',
	name: 'Pause Task',
	description: 'Pause an active task by id.',
	inputSchema: taskIdSchema,
	execute: ({ taskId }) => {
		pauseTask(taskId);
	},
});
