import { deleteTask } from '../../../tasks';
import { tool } from '../tool';
import { taskIdSchema } from './schema';

export const deleteTaskTool = tool({
	name: 'delete_task',
	description: 'Delete a task by id.',
	inputSchema: taskIdSchema,
	execute: ({ taskId }) => {
		deleteTask(taskId);
	},
});
