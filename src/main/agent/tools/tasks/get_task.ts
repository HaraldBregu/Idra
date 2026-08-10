import { getTask } from '../../../tasks';
import { tool } from '../tool';
import { taskIdSchema } from './schema';

export const getTaskTool = tool({
	id: 'get_task',
	name: 'Get Task',
	description: 'Fetch a single task by id.',
	inputSchema: taskIdSchema,
	execute: ({ taskId }) => getTask(taskId),
});
