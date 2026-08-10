import { updateTask } from '../../../tasks';
import { tool } from '../tool';
import { taskIdSchema, updateTaskRequestSchema } from './schema';

export const updateTaskTool = tool({
	name: 'update_task',
	defaultPermission: 'allow',
	risk: 'high',
	effect: 'persistence',
	description: 'Update an existing task by id.',
	inputSchema: taskIdSchema.extend({
		request: updateTaskRequestSchema.describe('Fields to update on the task.'),
	}),
	execute: ({ taskId, request }) => updateTask(taskId, request),
});
