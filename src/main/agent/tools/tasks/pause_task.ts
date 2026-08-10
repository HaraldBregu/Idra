import { pauseTask } from '../../../tasks';
import { tool } from '../tool';
import { taskIdSchema } from './schema';

export const pauseTaskTool = tool({
	name: 'pause_task',
	defaultPermission: 'allow',
	risk: 'high',
	effect: 'persistence',
	description: 'Pause an active task by id.',
	inputSchema: taskIdSchema,
	execute: ({ taskId }) => {
		pauseTask(taskId);
	},
});
