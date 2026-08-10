import { deleteSchedule } from '../../../tasks';
import { tool } from '../tool';
import { taskIdSchema } from './schema';

export const deleteTaskTool = tool({
	name: 'delete_task',
	defaultPermission: 'allow',
	risk: 'critical',
	effect: 'persistence',
	description: 'Delete a task by id.',
	inputSchema: taskIdSchema,
	execute: ({ taskId }) => {
		deleteSchedule(taskId);
	},
});
